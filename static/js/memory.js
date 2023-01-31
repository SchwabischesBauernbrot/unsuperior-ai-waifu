class MemoryModule {
    pushMemory(memory) { console.error("Don't use me!"); }
    buildPrompt() { console.error("Don't use me!"); return ""; }
}

class DumbMemoryModule extends MemoryModule {
    #memoryIndexOffset;
    constructor(basePrompt, memorySize = 12) {
        super();
        this.basePrompt = basePrompt;
        this.memorySize = memorySize;
        this.memory = [];
        this.#memoryIndexOffset = 0;
    }
    pushMemory(memory) {
        this.#memoryIndexOffset = (this.#memoryIndexOffset + 1) % this.memorySize;
        this.memory[this.#memoryIndexOffset] = memory;
    }
    buildPrompt() {
        // Apparently concating strings is the fastest method to build the prompt.
        // https://stackoverflow.com/questions/16696632/most-efficient-way-to-concatenate-strings-in-javascript
        var output = this.basePrompt + "\n";
        for (var i = 0; i < this.memorySize && i < this.memory.length; i++) {
            output += this.memory[(this.#memoryIndexOffset + i) % this.memorySize] + "\n";
        }
        return output;
    }
}

export { DumbMemoryModule };