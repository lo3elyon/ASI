/* face26: real faces for people the data had no photo for (files face-<id>.jpg, see asi-history/faces_extra.json).
   Add-only: wraps window.XPeopleAvatar so an empty photo falls back to the face file; loads right after people.js. */
(function () {
  "use strict";
  var FACES = {"rodney-brooks": "face-rodney-brooks.jpg", "francois-chollet": "face-francois-chollet.jpg", "jensen-huang": "face-jensen-huang.jpg", "anthony-zador": "face-anthony-zador.jpg", "noam-shazeer": "face-noam-shazeer.jpg", "david-silver": "face-david-silver.jpg", "blake-richards": "face-blake-richards.jpg", "karl-friston": "face-karl-friston.jpg", "matthew-botvinick": "face-matthew-botvinick.jpg", "michael-graziano": "face-michael-graziano.jpg", "terrence-sejnowski": "face-terrence-sejnowski.jpg", "dzmitry-bahdanau": "face-dzmitry-bahdanau.jpg", "hans-moravec": "face-hans-moravec.jpg"};
  window.XFaces26 = FACES;
  var orig = window.XPeopleAvatar;
  if (typeof orig !== "function") return;
  window.XPeopleAvatar = function (p, cls) {
    try {
      if (p && !p.photo && FACES[p.id]) { var q = {}; for (var k in p) q[k] = p[k]; q.photo = FACES[p.id]; p = q; }
    } catch (e) {}
    return orig.apply(this, [p, cls].concat([].slice.call(arguments, 2)));
  };
})();
