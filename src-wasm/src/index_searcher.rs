use std::{collections::BTreeMap, default};

use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub struct IndexSearcher {
    map: BTreeMap<String, usize>,
}

#[wasm_bindgen]
pub struct FileRange {
    pub start: Option<usize>,
    pub end: Option<usize>,
}

#[wasm_bindgen]
pub struct Weighting {
    term: String,
    pub weight: f64,
}

#[wasm_bindgen]
impl Weighting {
    pub fn get_term(&self) -> String {
        self.term.clone()
    }
}

#[wasm_bindgen]
impl IndexSearcher {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        IndexSearcher {
            map: default::Default::default(),
        }
    }

    pub fn get_header_length_size() -> u8 {
        size_of::<usize>() as u8
    }

    pub fn get_header_length(slice: Vec<u8>) -> usize {
        usize::from_ne_bytes(
            slice[0..(IndexSearcher::get_header_length_size() as usize)]
                .try_into()
                .unwrap(),
        )
    }

    pub fn load_header(&mut self, slice: Vec<u8>) {
        self.map = postcard::from_bytes(&slice).unwrap();
    }

    pub fn get_slice_for(&mut self, filename: String) -> FileRange {
        let mut range = self.map.range(filename..);
        let el = range.next();
        let el2 = range.next();

        FileRange {
            start: el2.and_then(|f| Some(f.1)).copied(),
            end: el.and_then(|f| Some(f.1)).copied(),
        }
    }

    pub fn get_index_data_for(&mut self, slice: Vec<u8>) -> Vec<Weighting> {
        let weights: Vec<(String, f64)> = postcard::from_bytes(&slice).unwrap();
        return weights.iter().map(|e| Weighting {
            term: e.0.clone(),
            weight: e.1,
        }).collect();
    }
}
