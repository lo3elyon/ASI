/* fix20: placement now lives in fix18 place(); this file only tracks the end-of-scroll flag. */
(function(){"use strict";document.addEventListener("scroll",function(e){var m=e.target;if(!m||!m.classList||!m.classList.contains("x-apx-menu"))return;var at=m.scrollTop+m.clientHeight>=m.scrollHeight-2;if(at!==m.hasAttribute("data-f20end"))m.toggleAttribute("data-f20end",at);},true);})();
