<template> 
<div class="home"></div>
</template>


<script lang="ts">

import { Button, ColorPicker } from 'map-ui';
import 'map-ui/map-ui.cjs.development.css';

import { defineComponent } from 'vue';

export default defineComponent({
  data: () => {
    return {

    }
  },

  mounted() {
    const b = new Button({
      text: 'Button'
    });
    // const c = new ColorPicker()
    this.$el.append(b.dom)
    // this.$el.append(c.dom)
  }
})
 
</script>


<style scoped>
  .home {
    display: flex;
    height: 100vh;
    width: 100%;
    justify-content: center;
    align-items: center;
  }
</style>
