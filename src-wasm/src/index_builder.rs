use std::collections::{BTreeMap, HashSet};

use wasm_bindgen::prelude::wasm_bindgen;

use crate::index_searcher::{DocumentToTermListIndexSearcher, TermToDocumentWeightIndexSearcher};

pub type DocumentID = usize;

#[derive(Default)]
pub struct Term {
    pub documents: BTreeMap<DocumentID, usize>,
    pub top_occurrences: usize,
}

#[wasm_bindgen]
pub struct IndexBuilder {
    stopwords: HashSet<String>,
    #[wasm_bindgen(skip)]
    pub terms: BTreeMap<String, Term>,
    #[wasm_bindgen(skip)]
    pub document_count: usize,
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
            terms: BTreeMap::new(),
            document_count: 0,
        }
    }

    pub fn add_document(&mut self, document_id: DocumentID, content: String) {
        content
            .split(|c: char| !c.is_ascii_alphabetic())
            .map(|s| porter_stemmer::stem(s).to_lowercase())
            .filter(|s| !s.is_empty() && !self.stopwords.contains(s))
            .for_each(|stemmed| {
                let term = self.terms.entry(stemmed).or_default();
                *term.documents.entry(document_id).or_default() += 1;
                let new_count = term.documents[&document_id];
                if new_count > term.top_occurrences {
                    term.top_occurrences = new_count;
                }
            });
        self.document_count += 1;
    }

    pub fn create_term_to_document_weight_index_file(&self) -> Vec<u8> {
        TermToDocumentWeightIndexSearcher::create_index_file(self)
    }

    pub fn create_document_to_term_list(&self) -> Vec<u8> {
        DocumentToTermListIndexSearcher::create_index_file(self)
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
        s
    }
}

impl Default for IndexBuilder {
    fn default() -> Self {
        Self::new()
    }
}
