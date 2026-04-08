use std::{
    collections::{BTreeMap, HashMap, HashSet},
    io::Write,
};

use wasm_bindgen::prelude::wasm_bindgen;

#[derive(Default)]
struct Term {
    documents: BTreeMap<String, usize>,
    top_occurrences: usize,
}

#[wasm_bindgen]
pub struct IndexBuilder {
    stopwords: HashSet<String>,
    terms: HashMap<String, Term>,
    document_count: usize,
}

#[wasm_bindgen]
impl IndexBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        IndexBuilder {
            stopwords: HashSet::from_iter(
                stop_words::get(stop_words::LANGUAGE::English)
                    .iter()
                    .map(|s| porter_stemmer::stem(s).to_lowercase()),
            ),
            terms: HashMap::new(),
            document_count: 0,
        }
    }

    pub fn add_document(&mut self, document_id: String, content: String) {
        content
            .split(|c: char| !c.is_ascii_alphabetic())
            .map(|s| porter_stemmer::stem(s).to_lowercase())
            .filter(|s| !s.is_empty() && !self.stopwords.contains(s))
            .for_each(|stemmed| {
                let term = self.terms.entry(stemmed).or_default();
                *term.documents.entry(document_id.clone()).or_default() += 1;
                let new_count = term.documents[&document_id];
                if new_count > term.top_occurrences {
                    term.top_occurrences = new_count;
                }
            });
        self.document_count += 1;
    }

    pub fn calculate_weights(&self) -> Vec<u8> {
        let mut buf = Vec::<u8>::new();

        let mut map = BTreeMap::<String, usize>::new();

        for (term, _) in &self.terms {
            map.insert(term.clone(), usize::max_value());
        }

        let header = postcard::to_stdvec(&map).unwrap();

        buf.write_all(&0usize.to_ne_bytes()).unwrap();
        buf.write_all(&header).unwrap();

        for (term, term_data) in &self.terms {
            let weights: Vec<(String, f64)> = term_data
                .documents
                .iter()
                .map(|(document_id, occurrences)| {
                    let tf = *occurrences as f64 / term_data.top_occurrences as f64;
                    let idf =
                        f64::log2(self.document_count as f64 / term_data.documents.len() as f64);
                    (document_id.clone(), tf * idf)
                })
                .collect();

            match map.get_mut(term) {
                Some(pos) => *pos = buf.len(),
                None => {}
            };

            buf.write_all(&postcard::to_stdvec(&weights).unwrap())
                .unwrap();
        }

        let header = postcard::to_stdvec(&map).unwrap();
        buf[0..size_of::<usize>()].copy_from_slice(&header.len().to_ne_bytes());
        buf[size_of::<usize>()..(size_of::<usize>() + header.len())].copy_from_slice(&header);

        return buf;
    }

    pub fn stats(&self) -> usize {
        self.terms.len()
    }

    pub fn get_something(&self) -> String {
        let mut s = String::new();
        for i in self.terms.iter().take(1) {
            s += &format!("Term {} \n", i.0);
            for x in &i.1.documents {
                s += &format!("Present in document {}, {} times\n", x.0, x.1);
            }
        }
        return s;
    }
}

impl Default for IndexBuilder {
    fn default() -> Self {
        Self::new()
    }
}
