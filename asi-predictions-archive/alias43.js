/* alias43: duplicate people (samuel-marks -> sam-marks, rob-miles -> robert-miles). Redirect old routes, hide duplicate cards. Add-only. */
(function(){
  var M={'samuel-marks':'sam-marks','rob-miles':'robert-miles'};
  function fix(){
    var m=location.hash.match(/^#\/person\/([\w-]+)(.*)$/);
    if(m&&M[m[1]]) history.replaceState(null,'','#/person/'+M[m[1]]+m[2]), window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  fix(); window.addEventListener('hashchange',fix);
  var st=document.createElement('style');
  st.textContent=Object.keys(M).map(function(k){return '.x-pc[data-id="'+k+'"]'}).join(',')+'{display:none!important}';
  document.head.appendChild(st);
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="#/person/"]');if(!a)return;var id=a.getAttribute('href').slice(9).split(/[?#\/]/)[0];if(M[id])a.setAttribute('href','#/person/'+M[id]);},true);
})();
