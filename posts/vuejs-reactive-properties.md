In Vue.js, reactive properties are properties that react to changes in other properties. This is a key feature of Vue that lets you build dynamic, reactive user interfaces.

There are several types of reactive properties in Vue.js:

1. **Data properties** — properties defined in the `data` object of a Vue component. When you define a data property, Vue automatically makes it reactive, meaning it will update the DOM whenever the property changes.

2. **Computed properties** — properties derived from one or more data properties using a computation. Computed properties are cached and only re-evaluated when their dependencies change, which makes them efficient for complex computations that run frequently.

3. **Watchers** — functions that are called whenever a data property or computed property changes. Use watchers to perform side effects or trigger other changes based on changes in the underlying data.

4. **Methods** — functions defined in the `methods` object. Methods are not reactive themselves, but they can modify reactive properties and trigger reactivity.

5. **Props** — properties passed down to a component from its parent. Like data properties, props are reactive and can trigger DOM updates.

Together, these reactive properties let you build dynamic UIs by defining properties that respond to changes in other properties.

```html
<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Double: {{ double }}</p>
    <input type="text" ref="input" v-model="text" />
    <p>Text length: {{ textLength }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      count: 0,
      text: ''
    }
  },
  computed: {
    double() {
      return this.count * 2
    },
    textLength() {
      return this.text.length
    }
  },
  methods: {
    incrementCount() {
      this.count++
    }
  },
  watch: {
    count(newValue, oldValue) {
      console.log(`Count changed from ${oldValue} to ${newValue}`)
    }
  },
  mounted() {
    this.$refs.input.focus()
  }
}
</script>
```

In this example we define a Vue component with a `count` data property initialised to `0`, and a `text` data property bound to an input using `v-model`. We define a computed property `double` that returns `count * 2`, and `textLength` that returns the length of the text string.

We define a method `incrementCount` that increases `count` by 1, and a watcher that logs a message to the console whenever `count` changes.

Finally, we use the `mounted` lifecycle hook to focus the input element via a `ref`.

Whenever `count` changes, the watcher logs a message. Whenever `text` changes, `textLength` is recomputed and the template updates. `double` is also recomputed whenever `count` changes. When the component mounts, the input gets focused.

This example demonstrates how data, computed, watchers and refs can work together in a Vue component to create dynamic, reactive user interfaces.

---

### References

1. [Vue.js — Guide](https://vuejs.org/guide/introduction.html)
2. [Vue School](https://vueschool.io/)
