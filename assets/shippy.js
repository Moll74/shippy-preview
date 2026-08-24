(function(){
  "use strict";
  // Reveal-animationen er opt-in: uden denne klasse er alt indhold synligt.
  document.documentElement.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- theme toggle ---------- */
  var root = document.documentElement;
  try{
    var saved = localStorage.getItem("shippy-theme");
    if(saved) root.setAttribute("data-theme", saved);
  }catch(e){}
  var themeBtn = document.getElementById("themeBtn");
  if(themeBtn) themeBtn.addEventListener("click", function(){
    var isDark = root.getAttribute("data-theme") === "dark" ||
      (!root.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var next = isDark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try{ localStorage.setItem("shippy-theme", next); }catch(e){}
  });

  /* ---------- mobile drawer ---------- */
  var burger = document.getElementById("burger"), drawer = document.getElementById("drawer");
  if(burger && drawer){
  burger.addEventListener("click", function(){
    var open = drawer.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  });
  drawer.addEventListener("click", function(e){
    if(e.target.tagName === "A"){
      drawer.classList.remove("open");
      burger.setAttribute("aria-expanded","false");
      document.body.style.overflow = "";
    }
  });
  }

  /* ---------- mega menu ----------
     Hover for pointers; click/Enter for keyboard and touch. On a coarse
     pointer the first tap opens the panel instead of following the link,
     so the submenu is reachable at all on a phone or tablet. */
  (function megamenu(){
    var groups = [].slice.call(document.querySelectorAll(".has-menu"));
    if(!groups.length) return;
    var coarse = window.matchMedia("(pointer: coarse)").matches;
    var closeTimer = null;

    function close(g){
      g.classList.remove("open");
      var t = g.querySelector(".nav-top");
      if(t) t.setAttribute("aria-expanded","false");
    }
    function closeAll(except){
      groups.forEach(function(g){ if(g !== except) close(g); });
    }
    function open(g){
      closeAll(g);
      g.classList.add("open");
      var t = g.querySelector(".nav-top");
      if(t) t.setAttribute("aria-expanded","true");
    }

    groups.forEach(function(g){
      var trigger = g.querySelector(".nav-top");

      if(!coarse){
        g.addEventListener("pointerenter", function(){
          clearTimeout(closeTimer); open(g);
        });
        g.addEventListener("pointerleave", function(){
          clearTimeout(closeTimer);
          closeTimer = setTimeout(function(){ close(g); }, 140);
        });
      }

      trigger.addEventListener("click", function(e){
        // On touch, or when the panel is shut, the first activation opens it.
        if(coarse && !g.classList.contains("open")){
          e.preventDefault(); open(g);
        }
      });

      trigger.addEventListener("keydown", function(e){
        if(e.key === "Enter" || e.key === " " || e.key === "ArrowDown"){
          if(!g.classList.contains("open")){
            e.preventDefault(); open(g);
            var first = g.querySelector(".megamenu a");
            if(first && e.key === "ArrowDown") first.focus();
          }
        }
      });

      // keep the panel open while focus is anywhere inside it
      g.addEventListener("focusin", function(){ clearTimeout(closeTimer); open(g); });
      g.addEventListener("focusout", function(){
        setTimeout(function(){
          if(!g.contains(document.activeElement)) close(g);
        }, 0);
      });
    });

    document.addEventListener("keydown", function(e){
      if(e.key === "Escape"){
        var openG = document.querySelector(".has-menu.open");
        if(openG){
          var t = openG.querySelector(".nav-top");
          close(openG);
          if(t) t.focus();
        }
      }
    });
    document.addEventListener("click", function(e){
      if(!e.target.closest(".has-menu")) closeAll(null);
    });
  })();

  /* ---------- site search ----------
     Indekset bygges af render.py; klienten henter det først ved åbning,
     så søgningen koster nul på sidevisninger. Diakritik-tolerant match. */
  (function siteSearch(){
    var btn = document.getElementById("searchBtn"),
        ov  = document.getElementById("searchOv");
    if(!btn || !ov) return;
    var inp = document.getElementById("searchInput"),
        res = document.getElementById("searchRes"),
        hint= document.getElementById("searchHint"),
        idx = null, sel = -1;

    function norm(t){
      return t.toLowerCase()
        .replace(/å/g,"a").replace(/æ/g,"ae").replace(/ø/g,"o");
    }
    function load(){
      if(idx) return Promise.resolve(idx);
      return fetch("/shippy-preview/assets/search-index.json")
        .then(function(r){ return r.json(); })
        .then(function(d){
          d.forEach(function(it){ it.n = norm(it.t + " " + it.d); });
          idx = d; return d;
        });
    }
    function open(){
      ov.hidden = false;
      document.body.style.overflow = "hidden";
      load().then(function(){ inp.focus(); });
    }
    function close(){
      ov.hidden = true;
      document.body.style.overflow = "";
      inp.value = ""; res.innerHTML = ""; hint.style.display = ""; sel = -1;
      btn.focus();
    }
    function render(list){
      sel = -1;
      res.innerHTML = list.slice(0, 9).map(function(it){
        return '<li><a href="' + it.u + '">'
          + '<span class="sr-k">' + it.k + '</span>'
          + '<span class="sr-t">' + it.t + '</span>'
          + (it.d ? '<span class="sr-d">' + it.d + '</span>' : '')
          + '</a></li>';
      }).join("");
      hint.style.display = list.length ? "none" : "";
      hint.textContent = list.length ? "" :
        "Ingen resultater — prøv et andet ord, eller ring på 60 40 00 00.";
    }
    btn.addEventListener("click", open);
    document.getElementById("searchClose").addEventListener("click", close);
    ov.addEventListener("click", function(e){ if(e.target === ov) close(); });
    document.addEventListener("keydown", function(e){
      if(e.key === "Escape" && !ov.hidden){ close(); return; }
      if(e.key === "/" && ov.hidden && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){
        e.preventDefault(); open(); return;
      }
      if(ov.hidden) return;
      var links = res.querySelectorAll("a");
      if(e.key === "ArrowDown" || e.key === "ArrowUp"){
        e.preventDefault();
        if(!links.length) return;
        sel = e.key === "ArrowDown"
          ? Math.min(sel + 1, links.length - 1) : Math.max(sel - 1, 0);
        links.forEach(function(a, i){ a.classList.toggle("sel", i === sel); });
        links[sel].scrollIntoView({block:"nearest"});
      } else if(e.key === "Enter" && sel >= 0 && links[sel]){
        links[sel].click();
      }
    });
    inp && inp.addEventListener("input", function(){
      var q = norm(inp.value.trim());
      if(q.length < 2){ res.innerHTML = ""; hint.style.display = ""; return; }
      var words = q.split(/\s+/);
      render(idx.filter(function(it){
        return words.every(function(w){ return it.n.indexOf(w) !== -1; });
      }));
    });
  })();

  /* ---------- reveal on scroll ---------- */
  var revs = document.querySelectorAll(".rv");
  if("IntersectionObserver" in window && !reduce){
    var ro = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); ro.unobserve(e.target); } });
    },{ rootMargin:"0px 0px -12% 0px", threshold:.08 });
    revs.forEach(function(el){ ro.observe(el); });
    // Failsafe (analysens trin 11): ingen sektion må forblive blank, uanset
    // scrollhastighed eller observer-fejl. Efter 2,5 s vises alt.
    setTimeout(function(){ revs.forEach(function(el){ el.classList.add("in"); }); }, 2500);
  } else {
    revs.forEach(function(el){ el.classList.add("in"); });
  }

  /* ---------- inline form-validering: grønt flueben ---------- */
  document.querySelectorAll(".fld input[required], .fld input[type=email]").forEach(function(inp){
    var mark = document.createElement("span");
    mark.className = "fld-check";
    mark.setAttribute("aria-hidden", "true");
    mark.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    inp.parentElement.appendChild(mark);
  });

  /* ---------- hero quote ----------
     Vary which voice greets a visitor without animating anything in front of
     them. A rotator beside the primary CTA steals attention at the moment of
     decision, and its later slides tend not to get read at all. All three stay
     in the DOM for crawlers; the choice is per page load. */
  (function heroQuote(){
    var quotes = [].slice.call(document.querySelectorAll("[data-quote]"));
    if(quotes.length < 2) return;
    var pick = Math.floor(Math.random() * quotes.length);
    quotes.forEach(function(q, i){
      if(i === pick) q.removeAttribute("hidden");
      else q.setAttribute("hidden", "");
    });
  })();

  /* ---------- customer logo marquee ----------
     Measure once the logos have actually loaded, otherwise the images report
     their intrinsic width (Britt Sisseck is 661px natural) and the set looks
     far wider than it is. Layout is applied even under reduced motion; only
     the animation is withheld. */
  (function marquee(){
    var track = document.getElementById("mqTrack");
    if(!track) return;

    var originals = [].slice.call(track.children);
    if(!originals.length) return;

    function build(){
      [].slice.call(track.children).forEach(function(c, i){
        if(i >= originals.length) c.remove();
      });
      track.classList.remove("is-running", "is-laid-out");

      track.classList.add("is-measuring");
      track.style.gap = "";
      var container = track.parentElement;
      var cw = container.clientWidth;
      var items = 0;
      originals.forEach(function(n){ items += n.getBoundingClientRect().width; });

      if(!cw || !items){ track.classList.remove("is-measuring"); return; }

      // Space the items so ONE set spans the viewport. A fixed gap puts three
      // copies on screen at once on a wide display.
      var gap = (cw - items) / originals.length;
      gap = Math.max(40, Math.min(300, gap));
      track.style.gap = gap + "px";

      var setWidth = track.scrollWidth;
      track.classList.remove("is-measuring");
      if(!setWidth){ return; }

      track.classList.add("is-laid-out");

      var step = setWidth + gap;
      var copies = Math.max(1, Math.ceil((cw * 2 + step) / step));
      for(var c = 0; c < copies; c++){
        originals.forEach(function(node){
          var clone = node.cloneNode(true);
          clone.setAttribute("aria-hidden", "true");
          [].slice.call(clone.querySelectorAll("a")).forEach(function(a){ a.tabIndex = -1; });
          track.appendChild(clone);
        });
      }

      track.style.setProperty("--mq-shift", step + "px");
      track.style.setProperty("--mq-dur", Math.max(9, step / 48) + "s");
      if(!reduce) track.classList.add("is-running");
    }

    // wait for the logos to load before measuring
    function whenReady(fn){
      var imgs = [].slice.call(track.querySelectorAll("img"));
      var pending = imgs.filter(function(i){ return !i.complete; });
      if(!pending.length) return fn();
      var left = pending.length, done = false;
      function tick(){
        if(--left <= 0 && !done){ done = true; fn(); }
      }
      pending.forEach(function(i){
        i.addEventListener("load", tick, {once:true});
        i.addEventListener("error", tick, {once:true});
      });
      // never hang on a stalled image
      setTimeout(function(){ if(!done){ done = true; fn(); } }, 2500);
    }

    whenReady(build);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(build);

    var tid;
    window.addEventListener("resize", function(){
      clearTimeout(tid); tid = setTimeout(build, 220);
    }, {passive:true});

    if("IntersectionObserver" in window){
      new IntersectionObserver(function(es){
        es.forEach(function(e){
          track.style.animationPlayState = e.isIntersecting ? "running" : "paused";
        });
      },{threshold:0}).observe(track);
    }
  })();

  /* ---------- count-up on the proof figure ---------- */
  (function countUp(){
    var el = document.querySelector("[data-count]");
    if(!el) return;
    var target = parseFloat(el.getAttribute("data-count"));
    if(reduce || !("IntersectionObserver" in window)){ el.textContent = target; return; }
    var done = false;
    new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting || done) return;
        done = true;
        var t0 = null, dur = 1100;
        function step(t){
          if(!t0) t0 = t;
          var k = Math.min(1, (t-t0)/dur);
          k = 1 - Math.pow(1-k, 3);                 // ease-out cubic
          el.textContent = (target*k).toFixed(target % 1 ? 1 : 0);
          if(k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    },{threshold:.4}).observe(el);
  })();

  /* ============================================================
     HERO — perspective-projected warehouse corridor.
     Real 3D maths on a 2D canvas: no library, ~4kb, 60fps.
     ============================================================ */
  (function warehouse(){
    var cv = document.getElementById("warehouse");
    if(!cv) return;
    var ctx = cv.getContext("2d"), W=0, H=0, dpr=1, camZ=0, raf=null;

    var FOCAL = 640;      // focal length
    var BAY   = 9;        // depth between racking bays
    var DEPTH = 26;       // bays drawn
    var AISLE = 15;       // half-width of the aisle
    var UP    = 12;       // rack height above camera
    var DOWN  = 7;        // floor below camera

    var tiltX = 0, tiltY = 0, curX = 0, curY = 0;

    function size(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    // project a world point to screen; null if behind the camera
    function P(x,y,z){
      var zz = z - camZ;
      if(zz < 1.2) return null;
      var s = FOCAL / zz;
      return {
        x: W/2 + (x + curY*zz*0.05) * s,
        y: H*0.52 + (y + curX*zz*0.05) * s,
        s: s,
        z: zz
      };
    }
    function line(a,b,col,w){
      if(!a||!b) return;
      ctx.strokeStyle=col; ctx.lineWidth=w||1;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
    // depth fade: near is bright, far dissolves into the ground
    function fade(z, base){ return Math.max(0, Math.min(1, 1 - z/(DEPTH*BAY))) * base; }

    function draw(){
      ctx.fillStyle = "#051726";
      ctx.fillRect(0,0,W,H);

      curX += (tiltX - curX)*0.055;
      curY += (tiltY - curY)*0.055;

      var horizon = P(0,0,camZ+DEPTH*BAY);
      if(horizon){
        var hg = ctx.createRadialGradient(horizon.x, horizon.y, 0, horizon.x, horizon.y, Math.max(W,H)*0.42);
        hg.addColorStop(0,   "rgba(96,150,180,.30)");
        hg.addColorStop(.45, "rgba(60,105,135,.10)");
        hg.addColorStop(1,   "rgba(5,23,38,0)");
        ctx.fillStyle = hg;
        ctx.fillRect(0,0,W,H);
      }

      var base = Math.floor(camZ/BAY)*BAY;

      for(var i=0;i<DEPTH;i++){
        var zw = base + i*BAY;
        var a = P(-AISLE*2.1, DOWN, zw), b = P(AISLE*2.1, DOWN, zw);
        if(a&&b) line(a,b,"rgba(120,170,195,"+fade(zw-camZ,.13).toFixed(3)+")",1);
      }
      for(var sg=-1; sg<=1; sg+=2){
        var f1 = P(sg*AISLE*0.74, DOWN, camZ+2.2), f2 = P(sg*AISLE*0.74, DOWN, camZ+DEPTH*BAY);
        if(f1&&f2){
          var g = ctx.createLinearGradient(f1.x,f1.y,f2.x,f2.y);
          g.addColorStop(0,"rgba(244,206,35,.34)");
          g.addColorStop(1,"rgba(244,206,35,0)");
          ctx.strokeStyle=g; ctx.lineWidth=2.2;
          ctx.beginPath(); ctx.moveTo(f1.x,f1.y); ctx.lineTo(f2.x,f2.y); ctx.stroke();
        }
      }

      // stable pseudo-random so the racking does not shimmer as the camera moves
      function hash(a,b,c,d){
        var n = Math.sin(a*12.9898 + b*78.233 + c*37.719 + d*93.989) * 43758.5453;
        return n - Math.floor(n);
      }
      function quad(p1,p2,p3,p4,fill){
        if(!p1||!p2||!p3||!p4) return false;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.lineTo(p3.x,p3.y); ctx.lineTo(p4.x,p4.y);
        ctx.closePath(); ctx.fill();
        return true;
      }

      var LEVELS = 3;
      var SHELF_H = (DOWN + UP) / (LEVELS + 0.55);

      for(var bi = DEPTH-1; bi >= 0; bi--){
        var zb = base + bi*BAY, d = zb - camZ;
        if(d < 1.4) continue;
        var alpha = fade(d,1);
        if(alpha <= 0.012) continue;

        for(var side=-1; side<=1; side+=2){
          var xIn = side*AISLE;

          for(var lv=0; lv<LEVELS; lv++){
            var yBot = DOWN - lv*SHELF_H;
            var yTop = yBot - SHELF_H*0.86;

            quad(P(xIn,yTop,zb), P(xIn,yTop,zb+BAY), P(xIn,yBot,zb+BAY), P(xIn,yBot,zb),
                 "rgba(9,32,50,"+(alpha*.80).toFixed(3)+")");

            for(var k=0; k<3; k++){
              var hv = hash(zb, side, lv, k);
              if(hv < 0.34) continue;
              var z0 = zb + 0.5 + k*(BAY-1.2)/3;
              var z1 = z0 + (BAY-1.2)/3 * (0.62 + hv*0.30);
              var ch = SHELF_H * (0.42 + hv*0.42);
              var yc = yBot - ch;

              var lit = 0.20 + hv*0.16;
              if(!quad(P(xIn,yc,z0), P(xIn,yc,z1), P(xIn,yBot,z1), P(xIn,yBot,z0),
                       "rgba(198,159,111,"+(alpha*lit).toFixed(3)+")")) continue;

              if(hv > 0.72){
                var zm = (z0+z1)/2;
                var tp = P(xIn,yc,zm);
                line(tp, P(xIn,yBot,zm),
                     "rgba(52,188,83,"+(alpha*.30).toFixed(3)+")",
                     Math.min(4, Math.max(1, 1.4*(tp?tp.s:0))));
              }
            }

            line(P(xIn,yBot,zb), P(xIn,yBot,zb+BAY),
                 "rgba(150,205,230,"+(alpha*.30).toFixed(3)+")", 1.2);
          }

          line(P(xIn,-UP,zb), P(xIn,DOWN,zb), "rgba(160,210,235,"+(alpha*.34).toFixed(3)+")", 1.6);
        }

        var zl = zb + BAY/2, dl = zl - camZ;
        if(dl > 2){
          var la = fade(dl,.62);
          var g1 = P(-3.6,-UP+1.1,zl), g2 = P(3.6,-UP+1.1,zl);
          if(g1&&g2){
            var br = Math.min(90, Math.max(10, 34*g1.s));
            var bloom = ctx.createRadialGradient((g1.x+g2.x)/2, g1.y, 0, (g1.x+g2.x)/2, g1.y, br);
            bloom.addColorStop(0,"rgba(214,238,255,"+(la*.16).toFixed(3)+")");
            bloom.addColorStop(1,"rgba(214,238,255,0)");
            ctx.fillStyle = bloom;
            ctx.beginPath();
            ctx.arc((g1.x+g2.x)/2, g1.y, br, 0, Math.PI*2);
            ctx.fill();
            line(g1,g2,"rgba(232,246,255,"+(la*.62).toFixed(3)+")", Math.min(7, Math.max(1, 2.2*g1.s)));
          }
        }
      }
    }

    var last = 0;
    function loop(t){
      if(!last) last = t;
      var dt = Math.min(60, t-last); last = t;
      camZ += dt * 0.0032;               // slow, continuous dolly down the aisle
      if(camZ > 1e6) camZ = 0;
      draw();
      raf = requestAnimationFrame(loop);
    }

    function start(){
      size();
      if(reduce){ draw(); return; }
      if(raf) cancelAnimationFrame(raf);
      last = 0; raf = requestAnimationFrame(loop);
    }

    window.addEventListener("resize", function(){ size(); if(reduce) draw(); }, {passive:true});
    if(!reduce){
      window.addEventListener("pointermove", function(e){
        tiltY = ((e.clientX / window.innerWidth) - .5) * -2.6;
        tiltX = ((e.clientY / window.innerHeight) - .5) * -1.6;
      }, {passive:true});
    }
    // pause when off-screen — never burn battery on an unseen canvas
    if("IntersectionObserver" in window){
      new IntersectionObserver(function(es){
        es.forEach(function(e){
          if(e.isIntersecting){ if(!raf && !reduce){ last=0; raf=requestAnimationFrame(loop); } }
          else if(raf){ cancelAnimationFrame(raf); raf=null; }
        });
      },{threshold:0}).observe(cv);
    }
    start();
  })();

  /* ============================================================
     JOURNEY — the parcel advances as the section scrolls past
     ============================================================ */
  (function journey(){
    var trav = document.getElementById("trav");
    var steps = document.querySelectorAll("#steps .step");
    var sec = document.getElementById("saadan");
    if(!trav || !sec) return;

    var ROT = [0, 120, 250];
    function update(){
      var r = sec.getBoundingClientRect();
      var vh = window.innerHeight;
      // 0 → 1 across the section's pass through the viewport
      var p = (vh - r.top) / (vh + r.height);
      p = Math.max(0, Math.min(1, p));
      var idx = p < .40 ? 0 : (p < .70 ? 1 : 2);

      trav.style.left = (6 + p*80) + "%";
      trav.style.transform = "rotateX(-16deg) rotateY(" + ROT[idx] + "deg)";
      steps.forEach(function(s,i){ s.classList.toggle("on", i === idx); });
    }
    if(reduce){ return; }
    var tick = false;
    window.addEventListener("scroll", function(){
      if(tick) return; tick = true;
      requestAnimationFrame(function(){ update(); tick = false; });
    }, {passive:true});
    window.addEventListener("resize", update, {passive:true});
    update();
  })();

  /* ============================================================
     SILO ART — three small canvases, one per business area
     ============================================================ */
  (function siloArt(){
    document.querySelectorAll(".silo-art canvas").forEach(function(cv){
      var kind = cv.getAttribute("data-art");
      var ctx = cv.getContext("2d"), W, H, dpr, t = 0, raf = null;

      function size(){
        dpr = Math.min(window.devicePixelRatio||1, 2);
        W = cv.clientWidth; H = cv.clientHeight;
        cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
        ctx.setTransform(dpr,0,0,dpr,0,0);
      }

      function racking(){
        // isometric shelving that fills as it goes
        ctx.clearRect(0,0,W,H);
        var cols = 7, rows = 3, cw = W/(cols+1.4), ch = H/(rows+1.6);
        for(var r=0;r<rows;r++){
          for(var c=0;c<cols;c++){
            var x = cw*0.8 + c*cw, y = ch*0.9 + r*ch;
            ctx.strokeStyle = "rgba(140,190,215,.26)"; ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cw*0.82, ch*0.7);
            // fill pattern animates slowly — the warehouse breathing
            var lit = (Math.sin(t*0.7 + c*0.9 + r*1.7) + 1) / 2;
            if(lit > 0.45){
              ctx.fillStyle = "rgba(197,158,110," + (0.16 + lit*0.34).toFixed(3) + ")";
              ctx.fillRect(x+3, y+ch*0.7-3 - (ch*0.7-6)*lit, cw*0.82-6, (ch*0.7-6)*lit);
              if(lit > 0.82){
                ctx.fillStyle = "rgba(52,188,83,.75)";
                ctx.fillRect(x + cw*0.41 - 1.4, y+ch*0.7-3 - (ch*0.7-6)*lit, 2.8, (ch*0.7-6)*lit);
              }
            }
          }
        }
      }

      function routes(){
        // delivery arcs fanning out from one hub
        ctx.clearRect(0,0,W,H);
        var hx = W*0.16, hy = H*0.62;
        var targets = [[.55,.20],[.72,.38],[.86,.24],[.66,.72],[.88,.62],[.44,.82]];
        targets.forEach(function(tp,i){
          var tx = W*tp[0], ty = H*tp[1];
          var mx = (hx+tx)/2, my = (hy+ty)/2 - 34 - i*4;
          ctx.strokeStyle = "rgba(140,190,215,.22)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(hx,hy); ctx.quadraticCurveTo(mx,my,tx,ty); ctx.stroke();

          // a parcel running the arc
          var pr = ((t*0.30 + i*0.19) % 1);
          var q = 1-pr;
          var px = q*q*hx + 2*q*pr*mx + pr*pr*tx;
          var py = q*q*hy + 2*q*pr*my + pr*pr*ty;
          ctx.fillStyle = "rgba(52,188,83,.95)";
          ctx.beginPath(); ctx.arc(px,py, 2.8, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "rgba(52,188,83,.18)";
          ctx.beginPath(); ctx.arc(px,py, 8, 0, Math.PI*2); ctx.fill();

          ctx.fillStyle = "rgba(200,228,240,.42)";
          ctx.beginPath(); ctx.arc(tx,ty, 2.2, 0, Math.PI*2); ctx.fill();
        });
        // the hub
        ctx.fillStyle = "rgba(244,206,35,.92)";
        ctx.beginPath(); ctx.arc(hx,hy, 4.6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(244,206,35,.30)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(hx,hy, 10 + Math.sin(t*1.6)*3, 0, Math.PI*2); ctx.stroke();
      }

      function globe(){
        // rotating wireframe globe with the real trade lanes from Shippy's copy
        ctx.clearRect(0,0,W,H);
        var cx = W/2, cy = H/2 + 6, R = Math.min(W,H)*0.40;
        var rot = t*0.28;

        // latitude rings
        for(var la=-60; la<=60; la+=30){
          var rr = R*Math.cos(la*Math.PI/180), yy = cy - R*Math.sin(la*Math.PI/180);
          ctx.strokeStyle="rgba(140,190,215,.17)"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.ellipse(cx, yy, rr, rr*0.30, 0, 0, Math.PI*2); ctx.stroke();
        }
        // longitude arcs
        for(var lo=0; lo<6; lo++){
          var a = rot + lo*Math.PI/6;
          var w = Math.abs(Math.cos(a));
          ctx.strokeStyle="rgba(140,190,215,"+(0.07+w*0.16).toFixed(3)+")"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.ellipse(cx, cy, R*w, R, 0, 0, Math.PI*2); ctx.stroke();
        }
        // outline
        ctx.strokeStyle="rgba(180,220,238,.30)"; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();

        // trade lanes: Asia→DK, Europe→DK, DK→USA, DK→Israel
        var lanes = [[-1.15,.34,.12,-.10],[-.42,.10,.10,-.08],[.10,-.08,-.98,.16],[.10,-.08,.52,.30]];
        lanes.forEach(function(L,i){
          var a1 = L[0]+rot, y1 = L[1], a2 = L[2]+rot, y2 = L[3];
          var x1 = cx + Math.sin(a1)*R*Math.cos(y1), py1 = cy - Math.sin(y1)*R;
          var x2 = cx + Math.sin(a2)*R*Math.cos(y2), py2 = cy - Math.sin(y2)*R;
          var vis1 = Math.cos(a1) > -0.15, vis2 = Math.cos(a2) > -0.15;
          if(!vis1 && !vis2) return;
          var mx=(x1+x2)/2, my=(py1+py2)/2 - R*0.42;
          ctx.strokeStyle="rgba(52,188,83,.40)"; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.moveTo(x1,py1); ctx.quadraticCurveTo(mx,my,x2,py2); ctx.stroke();

          var pr = ((t*0.22 + i*0.25) % 1), q = 1-pr;
          var px = q*q*x1 + 2*q*pr*mx + pr*pr*x2;
          var py = q*q*py1 + 2*q*pr*my + pr*pr*py2;
          ctx.fillStyle="rgba(244,206,35,.95)";
          ctx.beginPath(); ctx.arc(px,py,2.6,0,Math.PI*2); ctx.fill();
        });
      }

      var render = kind === "racking" ? racking : (kind === "routes" ? routes : globe);
      function loop(){ t += 0.016; render(); raf = requestAnimationFrame(loop); }

      size();
      window.addEventListener("resize", function(){ size(); render(); }, {passive:true});
      if(reduce){ render(); return; }
      if("IntersectionObserver" in window){
        new IntersectionObserver(function(es){
          es.forEach(function(e){
            if(e.isIntersecting){ if(!raf) raf = requestAnimationFrame(loop); }
            else if(raf){ cancelAnimationFrame(raf); raf = null; }
          });
        },{threshold:0}).observe(cv);
      } else { loop(); }
    });
  })();

  /* ============================================================
     SILO CARDS — genuine 3D tilt toward the pointer
     ============================================================ */
  (function tilt(){
    if(reduce || window.matchMedia("(pointer: coarse)").matches) return;
    document.querySelectorAll(".tilt").forEach(function(card){
      card.addEventListener("pointermove", function(e){
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5;
        var py = (e.clientY - r.top) / r.height - .5;
        card.style.transform =
          "perspective(1400px) rotateY(" + (px*7).toFixed(2) + "deg) rotateX(" + (-py*7).toFixed(2) + "deg) translateY(-6px)";
      });
      card.addEventListener("pointerleave", function(){ card.style.transform = ""; });
    });
  })();

  /* ============================================================
     CTA — drifting parcel field, quiet version of the hero
     ============================================================ */
  (function ctaArt(){
    var cv = document.getElementById("ctaArt");
    if(!cv) return;
    var ctx = cv.getContext("2d"), W,H,dpr,t=0,raf=null,pts=[];

    function size(){
      dpr = Math.min(window.devicePixelRatio||1,2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      pts = [];
      var n = Math.round(W*H/26000);
      for(var i=0;i<n;i++){
        pts.push({ x:Math.random()*W, y:Math.random()*H, z:.3+Math.random()*.7, s:5+Math.random()*13, r:Math.random()*Math.PI });
      }
    }
    function render(){
      ctx.clearRect(0,0,W,H);
      pts.forEach(function(p){
        var x = p.x, y = (p.y - t*14*p.z) % (H+60); if(y < -60) y += H+60;
        var a = 0.05 + p.z*0.13;
        ctx.save(); ctx.translate(x,y); ctx.rotate(p.r + t*0.14*p.z);
        ctx.fillStyle = "rgba(197,158,110," + a.toFixed(3) + ")";
        ctx.fillRect(-p.s/2, -p.s/2, p.s, p.s);
        ctx.fillStyle = "rgba(52,188,83," + (a*0.9).toFixed(3) + ")";
        ctx.fillRect(-p.s*0.08, -p.s/2, p.s*0.16, p.s);
        ctx.restore();
      });
    }
    function loop(){ t += 0.016; render(); raf = requestAnimationFrame(loop); }
    size();
    window.addEventListener("resize", function(){ size(); render(); }, {passive:true});
    if(reduce){ render(); return; }
    if("IntersectionObserver" in window){
      new IntersectionObserver(function(es){
        es.forEach(function(e){
          if(e.isIntersecting){ if(!raf) raf = requestAnimationFrame(loop); }
          else if(raf){ cancelAnimationFrame(raf); raf=null; }
        });
      },{threshold:0}).observe(cv);
    } else { loop(); }
  })();

})();
