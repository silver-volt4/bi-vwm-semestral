use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub fn initialize() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}

#[wasm_bindgen]
pub fn stem(str: String) -> String {
    return porter_stemmer::stem(&str);
}
