# BI-VWM - Vector search model

This is an in-browser implementation of the vector search model, as lectured in the BI-VWM ("Searching the Web and Multimedia Databases") course at FIT CTU.

## Building

As the project uses both Rust and JavaScript, the build tools for these languages must be installed in order to compile the project. (Use **Cargo** for Rust and **NPM** for JavaScript.)

Invoke `npm ci` and `npm run build` to build the project. It will be output to `./dist/`.

During development, use `npm run dev` to spin up a development server. Import errors may occur if the Rust components have not been built beforehand, to do that, use `npm run build-wasm`.

## References

```
Tomáš Skopal, BI-VWM.21 - Vyhledávání na webu a v multimediálních databázích, Přednáška č. 3: Vector model of information retrieval.
```