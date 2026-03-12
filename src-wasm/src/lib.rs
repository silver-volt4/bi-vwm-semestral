use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn initialize() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}

#[wasm_bindgen]
pub fn stem(str: String) -> String {
    str.split(' ')
        .map(|s| porter_stemmer::stem(s))
        .collect::<Vec<_>>()
        .join(" ")
}

#[wasm_bindgen]
pub fn stopwords() {
    for x in stop_words::get(stop_words::LANGUAGE::English) {
        log(x);
    }
}
