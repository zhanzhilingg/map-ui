<template> 
<div class="index"></div>
</template>


<script lang="ts">

import * as mapui from 'map-ui';
import 'map-ui/map-ui.cjs.development.css';

import { defineComponent } from 'vue';

export default defineComponent({
  data: () => {
    return {

    }
  },

  mounted() {
    
    const panel = new mapui.Panel({
      collapsible:true,
      collapsed: false,
      sortable: false,
      removable: true,
      headerText: '填挖方分析',
    })
    console.log(panel)
    panel.append(new mapui.Button({text: '按钮'}))


    this.$el.append(panel.dom)
    
  }
})
 
</script>


<style scoped>
  .index {
    display: flex;
    height: 100vh;
    width: 100%;
    justify-content: center;
    align-items: center;
  }
</style>
