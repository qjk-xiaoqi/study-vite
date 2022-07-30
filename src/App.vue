<template>
  <h2>
    <span> {{ name }}</span>
  </h2>
</template>

<script>
import { ref } from 'vue';
export default {
  setup() {
    const name = ref('简易 vite');
    return { name };
  },
};
</script>

<style>
h2 {
  color: red;
}
</style>
