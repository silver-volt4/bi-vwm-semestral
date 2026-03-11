<script>
    import { stem } from "./lib/wasm";

    let str = $state();
    let strResult = $state();

    function doStem() {
        strResult = stem(str);
    }
</script>

<h1>Porter stemmer test</h1>

<div>
    <input type="text" bind:value={str} />
    <button onclick={doStem}>doStem</button>
</div>

<div>
    {strResult}
</div>
