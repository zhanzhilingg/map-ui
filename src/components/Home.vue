<template> 
<div class="home"></div>
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
        /**
       * 设置元素是否可折叠。
       */
      collapsible:true,
      /**
       * 设置元素是否应该折叠。
       */
      collapsed: false,
      /**
       * 设置面板是否可以重新排序。
       */
      sortable: false,
      /**
       * 设置面板是否水平折叠-当它是侧面板的情况。默认为“false”。
       */
      // collapseHorizontally?: boolean,
      /**
       * 设置是否可以移除面板。
       */
      removable: true,
      /**
       * 标题的高度(以像素为单位)。默认为32。
       */
      // headerSize: number,
      /**
       * 面板的标题文本。默认为空字符串。
       */
      headerText: '填挖方分析',
      // /**
      //  * Sets the panel type.
      //  */
      // // panelType: 'normal',
      // /**
      //  * 用于内容容器的DOM元素。
      //  */
      // content: HTMLElement,
      // /**
      //  * 用于头容器的DOM元素。
      //  */
      // header: HTMLElement
    })
    console.log(panel)
    panel.append(new mapui.Button({text: '按钮'}))


    this.$el.append(panel.dom)
    
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
