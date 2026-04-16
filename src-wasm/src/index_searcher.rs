use std::{
    collections::{BTreeMap, HashMap},
    default,
    io::Write,
};

use wasm_bindgen::prelude::wasm_bindgen;
use web_sys::js_sys::Math::pow;

use crate::index_builder::{DocumentID, IndexBuilder};

#[wasm_bindgen]
pub struct TermToDocumentWeightIndexSearcher {
    map: BTreeMap<String, usize>,
    weights: HashMap<String, Vec<Weighting>>,
}

#[wasm_bindgen]
pub struct FileRange {
    pub start: Option<usize>,
    pub end: Option<usize>,
}

#[wasm_bindgen]
pub struct Weighting {
    pub document: DocumentID,
    pub weight: f64,
}

impl TermToDocumentWeightIndexSearcher {
    pub fn create_index_file(builder: &IndexBuilder) -> Vec<u8> {
        let mut buf = Vec::<u8>::new();

        let mut map = BTreeMap::<String, usize>::new();

        for term in builder.terms.keys() {
            map.insert(term.clone(), usize::MAX);
        }

        let header = postcard::to_stdvec(&map).unwrap();

        buf.write_all(&0usize.to_ne_bytes()).unwrap();
        buf.write_all(&header).unwrap();

        for (term, term_data) in &builder.terms {
            let weights: Vec<(DocumentID, f64)> = term_data
                .documents
                .iter()
                .map(|(document_id, occurrences)| {
                    let tf = *occurrences as f64 / term_data.top_occurrences as f64;
                    let idf =
                        f64::log2(builder.document_count as f64 / term_data.documents.len() as f64);
                    (*document_id, tf * idf)
                })
                .collect();

            if let Some(pos) = map.get_mut(term) {
                *pos = buf.len()
            };

            buf.write_all(&postcard::to_stdvec(&weights).unwrap())
                .unwrap();
        }

        let header = postcard::to_stdvec(&map).unwrap();
        buf[0..size_of::<usize>()].copy_from_slice(&header.len().to_ne_bytes());
        buf[size_of::<usize>()..(size_of::<usize>() + header.len())].copy_from_slice(&header);

        buf
    }
}

#[wasm_bindgen]
impl TermToDocumentWeightIndexSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        TermToDocumentWeightIndexSearcher {
            map: default::Default::default(),
            weights: default::Default::default(),
        }
    }

    pub fn get_header_length_size() -> u8 {
        size_of::<usize>() as u8
    }

    pub fn get_header_length(slice: Vec<u8>) -> usize {
        usize::from_ne_bytes(
            slice[0..(TermToDocumentWeightIndexSearcher::get_header_length_size() as usize)]
                .try_into()
                .unwrap(),
        )
    }

    pub fn load_header(&mut self, slice: Vec<u8>) {
        self.map = postcard::from_bytes(&slice).unwrap();
    }

    pub fn get_all_terms(&mut self) -> Vec<String> {
        self.map.iter().map(|m| m.0.clone()).collect()
    }

    pub fn get_slice_for(&mut self, term: String) -> FileRange {
        let mut range = self.map.range(term..);
        let el = range.next();
        let el2 = range.next();

        FileRange {
            start: el.map(|f| f.1).copied(),
            end: el2.map(|f| f.1).copied(),
        }
    }

    pub fn get_weighting_data(&mut self, term: String, slice: Vec<u8>) {
        self.weights.insert(
            term.clone(),
            postcard::from_bytes::<Vec<(DocumentID, f64)>>(&slice)
                .unwrap()
                .iter()
                .map(|e| Weighting {
                    document: e.0,
                    weight: e.1,
                })
                .collect(),
        );
    }

    pub fn recommend_similar(
        &self,
        current_document: DocumentID,
        n_results: usize,
    ) -> Vec<Weighting> {
        let mut weights_of_current: HashMap<&String, (f64, usize)> = self
            .weights
            .iter()
            .filter_map(|w| {
                if let Ok(r) = w.1.binary_search_by_key(&current_document, |k| k.document) {
                    return Some((w.0, (w.1[r].weight, 0usize)));
                }
                None
            })
            .collect();

        let mut best_results = Vec::<Weighting>::new();

        let mut processed_document: usize = self
            .weights
            .iter()
            .filter_map(|w| w.1.first())
            .map(|w| w.document)
            .min()
            .unwrap();

        let mut next_document_id: Option<usize> = Some(0);

        while next_document_id.is_some() {
            next_document_id = None;

            let mut cossim_numerator: f64 = 0f64;
            let mut cossim_denum_left: f64 = 0f64;
            let mut cossim_denum_right: f64 = 0f64;

            weights_of_current
                .iter_mut()
                .for_each(|(term, (documents_weight, position))| {
                    cossim_denum_right += pow(*documents_weight, 2f64);

                    let term_data = self.weights.get(*term).unwrap();

                    let term_data_at_position = match term_data.get(*position) {
                        Some(v) => v,
                        None => return,
                    };

                    if term_data_at_position.document == processed_document {
                        *position += 1;
                        cossim_numerator += term_data_at_position.weight * (*documents_weight);
                        cossim_denum_left += pow(term_data_at_position.weight, 2f64)
                    }

                    if next_document_id.is_none_or(|next_document_id| {
                        term_data_at_position.document < next_document_id
                    }) {
                        next_document_id = Some(term_data_at_position.document);
                    }
                });

            if processed_document != current_document {
                let mut cossim = Weighting {
                    document: processed_document,
                    weight: cossim_numerator / f64::sqrt(cossim_denum_left * cossim_denum_right),
                };

                if f64::is_nan(cossim.weight) {
                    cossim.weight = 0f64;
                }

                if best_results.len() < n_results {
                    best_results.push(cossim);
                } else {
                    let (lowest_index, lowest_weight) = best_results
                        .iter()
                        .enumerate()
                        .min_by(|a, b| f64::total_cmp(&a.1.weight, &b.1.weight))
                        .map(|lowest| (lowest.0, lowest.1.weight))
                        .unwrap();

                    if cossim.weight > lowest_weight {
                        best_results[lowest_index] = cossim;
                    }
                }
            }

            processed_document = next_document_id.unwrap_or_default();
        }

        best_results.sort_by(|a, b| f64::total_cmp(&b.weight, &a.weight));

        best_results
    }
}

#[wasm_bindgen]
pub struct DocumentToTermListIndexSearcher {
    map: BTreeMap<DocumentID, usize>,
}

impl DocumentToTermListIndexSearcher {
    pub fn create_index_file(builder: &IndexBuilder) -> Vec<u8> {
        let mut buf = Vec::<u8>::new();

        let mut map = BTreeMap::<DocumentID, Vec<String>>::new();

        for (term, data) in &builder.terms {
            for document_id in data.documents.keys() {
                map.entry(*document_id).or_default().push(term.clone());
            }
        }

        let mut jump_map = map
            .keys()
            .map(|key| (*key, usize::MAX))
            .collect::<BTreeMap<DocumentID, usize>>();

        let header = postcard::to_stdvec(&jump_map).unwrap();

        buf.write_all(&0usize.to_ne_bytes()).unwrap();
        buf.write_all(&header).unwrap();

        for (document_id, terms) in &map {
            if let Some(pos) = jump_map.get_mut(document_id) {
                *pos = buf.len()
            };
            buf.write_all(&postcard::to_stdvec(&terms).unwrap())
                .unwrap();
        }

        let header = postcard::to_stdvec(&jump_map).unwrap();
        buf[0..size_of::<usize>()].copy_from_slice(&header.len().to_ne_bytes());
        buf[size_of::<usize>()..(size_of::<usize>() + header.len())].copy_from_slice(&header);

        buf
    }
}

#[wasm_bindgen]
impl DocumentToTermListIndexSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        DocumentToTermListIndexSearcher {
            map: default::Default::default(),
        }
    }

    pub fn get_header_length_size() -> u8 {
        size_of::<usize>() as u8
    }

    pub fn get_header_length(slice: Vec<u8>) -> usize {
        usize::from_ne_bytes(
            slice[0..(DocumentToTermListIndexSearcher::get_header_length_size() as usize)]
                .try_into()
                .unwrap(),
        )
    }

    pub fn load_header(&mut self, slice: Vec<u8>) {
        self.map = postcard::from_bytes(&slice).unwrap();
    }

    pub fn get_slice_for(&mut self, document: DocumentID) -> FileRange {
        let mut range = self.map.range(document..);
        let el = range.next();
        let el2 = range.next();

        FileRange {
            start: el.map(|f| f.1).copied(),
            end: el2.map(|f| f.1).copied(),
        }
    }

    pub fn get_index_data_for(&mut self, slice: Vec<u8>) -> Vec<String> {
        let terms: Vec<String> = postcard::from_bytes(&slice).unwrap();
        terms
    }
}
