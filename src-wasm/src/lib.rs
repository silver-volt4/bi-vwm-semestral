use std::collections::{BTreeMap, HashMap, HashSet};
use wasm_bindgen::{JsValue, prelude::wasm_bindgen};
use web_sys::js_sys::Function;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn initialize() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}

#[derive(Default)]
struct Term {
    documents: BTreeMap<usize, usize>,
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

    pub fn add_document(&mut self, document_id: usize, content: String) {
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

    pub fn calculate_weights(&self, cb: &Function) {
        for (term, term_data) in &self.terms {
            let weights: Vec<(usize, f64)> = term_data
                .documents
                .iter()
                .map(|(document_id, occurrences)| {
                    let tf = *occurrences as f64 / term_data.top_occurrences as f64;
                    let idf =
                        f64::log2(self.document_count as f64 / term_data.documents.len() as f64);
                    (*document_id, tf * idf)
                })
                .collect();
            cb.call2(
                &JsValue::NULL,
                &JsValue::from_str(&term),
                &serde_wasm_bindgen::to_value(&weights).unwrap(),
            )
            .unwrap();
        }
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
