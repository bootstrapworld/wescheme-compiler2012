/*global world, types */
if (typeof(world) === 'undefined') {
    world = {};
}

// Depends on kernel.js, world-config.js, effect-struct.js
(function() {
    'use strict';
    world.Kernel = {};
    var worldListeners = [];
    var stopped;
    var timerInterval = false;

    // Inheritance from pg 168: Javascript, the Definitive Guide.
    var heir = function(p) {
        var f = function() {};
        f.prototype = p;
        return new f();
    };

    // clone: object -> object
    // Copies an object.  The new object should respond like the old
    // object, including to things like instanceof
    var clone = function(obj) {
        var C = function() {};
        var property;
        C.prototype = obj;
        var c = new C();
        for (property in obj) {
            if (Object.hasOwnProperty.call(obj, property)) {
                c[property] = obj[property];
            }
        }
        return c;
    };

    var announceListeners = [];
    world.Kernel.addAnnounceListener = function(listener) {
        announceListeners.push(listener);
    };
    world.Kernel.removeAnnounceListener = function(listener) {
        var idx = announceListeners.indexOf(listener);
        if (idx !== -1) {
            announceListeners.splice(idx, 1);
        }
    };
    world.Kernel.announce = function(eventName, vals) {
        var i;
        for (i = 0; i < announceListeners.length; i++) {
            try {
                announceListeners[i](eventName, vals);
            } catch (e) {}
        }
    };


    // changeWorld: world -> void
    // Changes the current world to newWorld.
    var changeWorld = function(newWorld) {
        world = newWorld;
        notifyWorldListeners();
    };


    // updateWorld: (world -> world) -> void
    // Public function: update the world, given the old state of the
    // world.
    world.Kernel.updateWorld = function(updater) {
        var newWorld = updater(world);
        changeWorld(newWorld);
    };


    world.Kernel.shutdownWorld = function() {
        stopped = true;
    };


    // notifyWorldListeners: -> void
    // Tells all of the world listeners that the world has changed.
    var notifyWorldListeners = function() {
        var i;
        for (i = 0; i < worldListeners.length; i++) {
            worldListeners[i](world);
        }
    };

    // addWorldListener: (world -> void) -> void
    // Adds a new world listener: whenever the world is changed, the aListener
    // will be called with that new world.
    var addWorldListener = function(aListener) {
        worldListeners.push(aListener);
    };


    // getKeyCodeName: keyEvent -> String
    // Given an event, try to get the name of the key.
    var getKeyCodeName = function(e) {
        var code = e.charCode || e.keyCode;
        var keyname;
        if (code === 37) {
            keyname = "left";
        } else if (code === 38) {
            keyname = "up";
        } else if (code === 39) {
            keyname = "right";
        } else if (code === 40) {
            keyname = "down";
        } else {
            keyname = String.fromCharCode(code); 
        }
        return keyname;
    };

    // resetWorld: -> void
    // Resets all of the world global values.
    var resetWorld = function() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = false;
        }
        stopped = false;
        worldListeners = [];
    };


    var getBigBangWindow = function(width, height) {
        if (window.document.getElementById("canvas") !== undefined) {
            return window;
        }

        var newWindow = window.open(
            "big-bang.html",
            "big-bang");
        //"toolbar=false,location=false,directories=false,status=false,menubar=false,width="+width+",height="+height);
        if (newWindow === null) {
            throw new Error("Error: Not allowed to create a new window."); }

        return newWindow;
    };

    // scheduleTimerTick: -> void
    // Repeatedly schedules an evaluation of the onTick until the program has stopped.
    var scheduleTimerTick = function(window, config) {
        timerInterval = window.setInterval(
            function() {
                if (stopped) {
                    window.clearTimeout(timerInterval);
                    timerInterval = false;
                }
                else {
                    world.Kernel.stimuli.onTick();
                }
            },
            config.lookup('tickDelay'));
    };
 
    // given two arrays of {x,y} structs, determine their equivalence
    var verticesEqual = function(v1, v2){
        if(v1.length !== v2.length){ return false; }
        for(var i=0; i< v1.length; i++){
            if(v1[i].x !== v2[i].x || v1[i].y !== v2[i].y){ return false; }
        }
        return true;
    };
    // given two arrays of xs and ys, zip them into a vertex array
    var zipVertices = function(xs, ys){
        if(xs.length !== ys.length){throw new Error('failure in zipVertices');}
        var vertices = [];
        for(var i=0; i<xs.length;i++){
            vertices.push({x: xs[i], y: ys[i]});
        }
        return vertices;
    };
 
    // Base class for all images.
    var BaseImage = function() {};
    world.Kernel.BaseImage = BaseImage;


    var isImage = function(thing) {
        return (thing !== null &&
                thing !== undefined &&
                thing instanceof BaseImage);
    };
 
    BaseImage.prototype.updatePinhole = function(x, y) {
        var aCopy = clone(this);
        aCopy.pinholeX = x;
        aCopy.pinholeY = y;
        return aCopy;
    };

    BaseImage.prototype.getHeight = function(){
        return this.height;
    };
    BaseImage.prototype.getWidth = function(){
        return this.width;
    };
    BaseImage.prototype.getBaseline = function(){
        return this.height;
    };
    // return the vertex array if it exists, otherwise make one using height and width
    BaseImage.prototype.getVertices = function(){
        if(this.vertices){ return this.vertices; }
        else{ return [{x:0 , y: 0},
                      {x: this.width, y: 0},
                      {x: 0, y: this.height},
                      {x: this.width, y: this.height}]; }
    };

    // render: context fixnum fixnum: -> void
    // Render the image, where the upper-left corner of the image is drawn at
    // (x, y).
    // If the image isn't vertex-based, throw an error
    // Otherwise, stroke and fill the vertices.
    BaseImage.prototype.render = function(ctx, x, y) {
        if(!this.vertices){
            throw new Error('BaseImage.render is not implemented for this type!');
        }
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x+this.vertices[0].x, y+this.vertices[0].y);
        for(var i=1; i < this.vertices.length; i++){
            ctx.lineTo(x+this.vertices[i].x, y+this.vertices[i].y);
        }
        ctx.closePath();
       
        if (this.style.toString().toLowerCase() === "outline") {
            ctx.strokeStyle = colorString(this.color);
            ctx.stroke();
        } else {
            ctx.fillStyle = colorString(this.color, this.style);
            ctx.fill();
        }
        ctx.restore();
    };


    // makeCanvas: number number -> canvas
    // Constructs a canvas object of a particular width and height.
    world.Kernel.makeCanvas = function(width, height) {
        var canvas = document.createElement("canvas");
        canvas.width  = width;
        canvas.height = height;

        canvas.style.width  = canvas.width  + "px";
        canvas.style.height = canvas.height + "px";
        
        // KLUDGE: IE compatibility uses /js/excanvas.js, and dynamic
        // elements must be marked this way.
        if (window && typeof window.G_vmlCanvasManager !== 'undefined') {
            canvas = window.G_vmlCanvasManager.initElement(canvas);
        }
        return canvas;
    };

    var withIeHack = function(canvas, f) {
        var result = f(canvas);
        return result;
    };

    BaseImage.prototype.toDomNode = function(cache) {
        var that = this;
        var width = that.getWidth();
        var height = that.getHeight();
        var canvas = world.Kernel.makeCanvas(width, height);

        // KLUDGE: on IE, the canvas rendering functions depend on a
        // context where the canvas is attached to the DOM tree.

        // We initialize an afterAttach hook; the client's responsible
        // for calling this after the dom node is attached to the
        // document.
        canvas.afterAttach = function() {
            var ctx = canvas.getContext("2d");
            that.render(ctx, 0, 0);
        };
        return canvas;
    };

    BaseImage.prototype.toWrittenString = function(cache) { return "<image>"; };
    BaseImage.prototype.toDisplayedString = function(cache) { return "<image>"; };

    // Best-Guess equivalence for images. If they're vertex-based we're in luck,
    // otherwise we go pixel-by-pixel. It's up to exotic image types to provide
    // more efficient ways of comparing one another
    BaseImage.prototype.isEqual = function(other, aUnionFind) {
      if(this.width    !== other.width    ||
         this.height   !== other.height){ return false; }
      // if they're both vertex-based images, all we need to compare are
      // their styles, vertices and color
      if(this.vertices && other.vertices){
          return (this.style    === other.style &&
                  verticesEqual(this.vertices, other.vertices) &&
                  types.isEqual(this.color, other.color, aUnionFind));
      }
      // if it's something more sophisticated, render both images to canvases
      // First check canvas dimensions, then go pixel-by-pixel
      var c1 = this.toDomNode(), c2 = other.toDomNode();
      c1.afterAttach();  c2.afterAttach();
      if(c1.width !== c2.width || c1.height !== c2.height){ return false;}
      try{
        var ctx1 = c1.getContext('2d'), ctx2 = c2.getContext('2d'),
            data1 = ctx1.getImageData(0, 0, c1.width, c1.height),
            data2 = ctx2.getImageData(0, 0, c2.width, c2.height);
        var pixels1 = data1.data,
            pixels2 = data2.data;
        for(var i = 0; i < pixels1.length; i++){
            if(pixels1[i] !== pixels2[i]){ return false; }
        }
      } catch(e){
        // if we violate CORS, just bail
        return false;
      }
      // if, after all this, we're still good...then they're equal!
      return true;
    };

    // isScene: any -> boolean
    // Produces true when x is a scene.
    var isScene = function(x) {
        return ((x !== undefined) && (x !== null) && (x instanceof SceneImage));
    };

    //////////////////////////////////////////////////////////////////////
    // SceneImage: primitive-number primitive-number (listof image) -> Scene
    var SceneImage = function(width, height, children, withBorder) {
        BaseImage.call(this);
        this.width    = width;
        this.height   = height;
        this.children = children; // arrayof [image, number, number]
        this.withBorder = withBorder;
    };
    SceneImage.prototype = heir(BaseImage.prototype);

    // add: image primitive-number primitive-number -> Scene
    SceneImage.prototype.add = function(anImage, x, y) {
        return new SceneImage(this.width, 
                              this.height,
                              this.children.concat([[anImage, 
                                                     x - anImage.getWidth()/2,
                                                     y - anImage.getHeight()/2]]),
                              this.withBorder);
    };

    // render: 2d-context primitive-number primitive-number -> void
    SceneImage.prototype.render = function(ctx, x, y) {
        var i;
        var childImage, childX, childY;
        // create a clipping region around the boundaries of the Scene
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.fillRect(x, y, this.width, this.height);
        ctx.restore();
        // save the context, reset the path, and clip to the path around the scene edge
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, this.width, this.height);
        ctx.clip();
        // Ask every object to render itself inside the region
        for(i = 0; i < this.children.length; i++) {
            // then, render the child images
            childImage = this.children[i][0];
            childX = this.children[i][1];
            childY = this.children[i][2];
            childImage.render(ctx, childX + x, childY + y);
        }
        // unclip
        ctx.restore();

        if (this.withBorder) {
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x, y, this.width, this.height);
        }
    };

    SceneImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof SceneImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        if (this.width    !== other.width ||
            this.height   !== other.height ||
            this.children.length !== other.children.length) {
            return false;
        }

        for (var i = 0; i < this.children.length; i++) {
            var rec1 = this.children[i];
            var rec2 = other.children[i];
            if (rec1[1] !== rec2[1] ||
                rec1[2] !== rec2[2] ||
                !types.isEqual(rec1[0], rec2[0], aUnionFind)) {
                return false;
            }
        }
        return true;
    };


    //////////////////////////////////////////////////////////////////////
    // FileImage: string node -> Image
    var FileImage = function(src, rawImage, afterInit) {
        BaseImage.call(this);
        var self = this;
        this.src = src;
        this.isLoaded = false;

        // animationHack: see installHackToSupportAnimatedGifs() for details.
        this.animationHackImg = undefined;

        if (rawImage && rawImage.complete) { 
            this.img = rawImage;
            this.isLoaded = true;
            self.width = self.img.width;
            self.height = self.img.height;
        } else {
            // fixme: we may want to do something blocking here for
            // onload, since we don't know at this time what the file size
            // should be, nor will drawImage do the right thing until the
            // file is loaded.
            this.img = new Image();
            this.img.onload = function() {
                self.isLoaded = true;
                self.width = self.img.width;
                self.height = self.img.height;
            };
            this.img.onerror = function(e) {
                self.img.onerror = "";
                self.img.src = "http://www.wescheme.org/images/broken.png";
            };
            this.img.src = src;
        }
        this.installHackToSupportAnimatedGifs(afterInit);
    };
    FileImage.prototype = heir(BaseImage.prototype);

    var imageCache = {};
    FileImage.makeInstance = function(path, rawImage, afterInit) {
        if (! (path in imageCache)) {
            imageCache[path] = new FileImage(path, rawImage, afterInit);
            return imageCache[path];
        } else {
            afterInit(imageCache[path]);
            return imageCache[path];
        }
    };

    FileImage.installInstance = function(path, rawImage, afterInit) {
        imageCache[path] = new FileImage(path, rawImage, afterInit);
    };

    FileImage.installBrokenImage = function(path) {
        imageCache[path] = new TextImage("Unable to load " + path, 10, colorDb.get("red"),
                                         "normal", "Arial","","",false);
    };

    FileImage.prototype.render = function(ctx, x, y) {
        ctx.drawImage(this.animationHackImg, x, y);
    };

    // The following is a hack that we use to allow animated gifs to show
    // as animating on the canvas. They have to be added to the DOM as *images*
    // in order to have their frames fed to the canvas, so we add them someplace hidden
    FileImage.prototype.installHackToSupportAnimatedGifs = function(afterInit) {
        var that = this;
        this.animationHackImg = this.img.cloneNode(true);
        document.body.appendChild(this.animationHackImg);
        this.animationHackImg.style.position = 'absolute';
        this.animationHackImg.style.top = '-5000px';
 
        if (this.animationHackImg.complete) {
            afterInit(that);
        } else {
            this.animationHackImg.onload = function() {
                afterInit(that);
            };
        }
    };

    FileImage.prototype.getWidth = function() {
        return this.img.width;
    };

    FileImage.prototype.getHeight = function() {
        return this.img.height;
    };

    FileImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof FileImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.src === other.src);
    };

    //////////////////////////////////////////////////////////////////////
    // fileVideo: String Node -> Video
    var FileVideo = function(src, rawVideo) {
        BaseImage.call(this);
        var self = this;
        this.src = src;
        if (rawVideo) { 
            this.video                  = rawVideo;
            this.width                  = self.video.videoWidth;
            this.height                 = self.video.videoHeight;
            this.video.volume           = 1;
            this.video.poster           = "http://www.wescheme.org/images/broken.png";
            this.video.autoplay         = true;
            this.video.autobuffer       = true;
            this.video.loop             = true;
            this.video.play();
        } else {
            // fixme: we may want to do something blocking here for
            // onload, since we don't know at this time what the file size
            // should be, nor will drawImage do the right thing until the
            // file is loaded.
            this.video = document.createElement('video');
            this.video.src = src;
            this.video.addEventListener('canplay', function() {
                this.width              = self.video.videoWidth;
                this.height             = self.video.videoHeight;
                this.video.poster       = "http://www.wescheme.org/images/broken.png";
                this.video.autoplay     = true;
                this.video.autobuffer   = true;
                this.video.loop         = true;
                this.video.play();
            });
            this.video.addEventListener('error', function(e) {
                self.video.onerror = "";
                self.video.poster = "http://www.wescheme.org/images/broken.png";
            });
        }
    };
    FileVideo.prototype = heir(BaseImage.prototype);

    var videos = {};
    FileVideo.makeInstance = function(path, rawVideo) {
        if (! (path in FileVideo)) {
            videos[path] = new FileVideo(path, rawVideo);
        } 
        return videos[path];
    };

    FileVideo.prototype.render = function(ctx, x, y) {
        ctx.drawImage(this.video, x, y);
    };
    FileVideo.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof FileVideo)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.src === other.src);
    };
 
    //////////////////////////////////////////////////////////////////////
    // ImageDataImage: imageData -> image
    // Given an array of pixel data, create an image
    var ImageDataImage = function(imageData) {
        BaseImage.call(this);
        this.imageData= imageData;
        this.width    = imageData.width;
        this.height   = imageData.height;
    };
 
    ImageDataImage.prototype = heir(BaseImage.prototype);
 
    ImageDataImage.prototype.render = function(ctx, x, y) {
        ctx.putImageData(this.imageData, x, y);
    };

    //////////////////////////////////////////////////////////////////////
    // OverlayImage: image image placeX placeY -> image
    // Creates an image that overlays img1 on top of the
    // other image img2.
    var OverlayImage = function(img1, img2, placeX, placeY) {
        BaseImage.call(this);

        // An overlay image consists of width, height, x1, y1, x2, and
        // y2.  We need to compute these based on the inputs img1,
        // img2, placex, and placey.

        // placeX and placeY may be non-numbers, in which case their values
        // depend on the img1 and img2 geometry.
        
        var x1, y1, x2, y2;

        if (placeX === "left") {
            x1 = 0;
            x2 = 0;
        } else if (placeX === "right") {
            x1 = Math.max(img1.getWidth(), img2.getWidth()) - img1.getWidth();
            x2 = Math.max(img1.getWidth(), img2.getWidth()) - img2.getWidth();
        } else if (placeX === "beside") {
            x1 = 0;
            x2 = img1.getWidth();
        } else if (placeX === "middle" || placeX === "center") {
            x1 = Math.max(img1.getWidth(), img2.getWidth())/2 - img1.getWidth()/2;
            x2 = Math.max(img1.getWidth(), img2.getWidth())/2 - img2.getWidth()/2;
        } else {
            x1 = Math.max(placeX, 0) - placeX;
            x2 = Math.max(placeX, 0);
        }
        
        if (placeY === "top") {
            y1 = 0;
            y2 = 0;
        } else if (placeY === "bottom") {
            y1 = Math.max(img1.getHeight(), img2.getHeight()) - img1.getHeight();
            y2 = Math.max(img1.getHeight(), img2.getHeight()) - img2.getHeight();
        } else if (placeY === "above") {
            y1 = 0;
            y2 = img1.getHeight();
        } else if (placeY === "baseline") {
            y1 = Math.max(img1.getBaseline(), img2.getBaseline()) - img1.getBaseline();
            y2 = Math.max(img1.getBaseline(), img2.getBaseline()) - img2.getBaseline();
        } else if (placeY === "middle" || placeY === "center") {
            y1 = Math.max(img1.getHeight(), img2.getHeight())/2 - img1.getHeight()/2;
            y2 = Math.max(img1.getHeight(), img2.getHeight())/2 - img2.getHeight()/2;
        } else {
            y1 = Math.max(placeY, 0) - placeY;
            y2 = Math.max(placeY, 0);
        }
        // calculate the vertices of this image by translating the verticies of the sub-images
        var i, v1 = img1.getVertices(), v2 = img2.getVertices(), xs = [], ys = [];
        for(i=0; i<v1.length; i++){
            xs.push(Math.round(v1[i].x + x1));
            ys.push(Math.round(v1[i].y + y1));
        }
        for(i=0; i<v2.length; i++){
            xs.push(Math.round(v2[i].x + x2));
            ys.push(Math.round(v2[i].y + y2));
        }
        // store the vertices as something private, so this.getVertices() will still return undefined
        this._vertices = zipVertices(xs, ys);
        this.width  = Math.max.apply(Math, xs) - Math.min.apply(Math, xs);
        this.height = Math.max.apply(Math, ys) - Math.min.apply(Math, ys);
 
        // store the offsets for rendering
        this.x1 = Math.floor(x1);
        this.y1 = Math.floor(y1);
        this.x2 = Math.floor(x2);
        this.y2 = Math.floor(y2);
        this.img1 = img1;
        this.img2 = img2;
    };

    OverlayImage.prototype = heir(BaseImage.prototype);
 
    OverlayImage.prototype.getVertices = function() { return this._vertices; };
 
    OverlayImage.prototype.render = function(ctx, x, y) {
        ctx.save();
        this.img2.render(ctx, x + this.x2, y + this.y2);
        this.img1.render(ctx, x + this.x1, y + this.y1);
        ctx.restore();
    };

    OverlayImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof OverlayImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.width     === other.width &&
               this.height    === other.height &&
               this.x1        === other.x1 &&
               this.y1        === other.y1 &&
               this.x2        === other.x2 &&
               this.y2        === other.y2 &&
               types.isEqual(this.img1, other.img1, aUnionFind) &&
               types.isEqual(this.img2, other.img2, aUnionFind) );
    };


    //////////////////////////////////////////////////////////////////////
    // rotate: angle image -> image
    // Rotates image by angle degrees in a counter-clockwise direction.
    // TODO: special case for ellipse?
    var RotateImage = function(angle, img) {
        BaseImage.call(this);
        var sin   = Math.sin(angle * Math.PI / 180);
        var cos   = Math.cos(angle * Math.PI / 180);
        var width = img.getWidth();
        var height= img.getHeight();
 
        // rotate each point as if it were rotated about (0,0)
        var vertices = img.getVertices(), xs = [], ys = [];
        for(var i=0; i<vertices.length; i++){
            xs[i] = Math.round(vertices[i].x*cos - vertices[i].y*sin);
            ys[i] = Math.round(vertices[i].x*sin + vertices[i].y*cos);
        }
        // figure out what translation is necessary to shift the vertices back to 0,0
        var translateX = Math.floor(-Math.min.apply( Math, xs ));
        var translateY = Math.floor(-Math.min.apply( Math, ys ));
        for(var i=0; i<vertices.length; i++){
            xs[i] += translateX;
            ys[i] += translateY;
       }
 
        // store the vertices as something private, so this.getVertices() will still return undefined
        this._vertices = zipVertices(xs,ys);
        var rotatedWidth  = Math.max.apply( Math, xs ) - Math.min.apply( Math, xs );
        var rotatedHeight = Math.max.apply( Math, ys ) - Math.min.apply( Math, ys );

        this.img        = img;
        this.width      = Math.floor(rotatedWidth);
        this.height     = Math.floor(rotatedHeight);
        this.angle      = angle;
        this.translateX = translateX;
        this.translateY  = translateY;
    };

    RotateImage.prototype = heir(BaseImage.prototype);

    RotateImage.prototype.getVertices = function() { return this._vertices; };

    // translate the canvas using the calculated values, then draw at the rotated (x,y) offset.
    RotateImage.prototype.render = function(ctx, x, y) {
        ctx.save();
        ctx.translate(x+this.translateX, y + this.translateY);
        ctx.rotate(this.angle * Math.PI / 180);
        this.img.render(ctx, 0, 0);
        ctx.restore();
    };

    RotateImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof RotateImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.width     === other.width &&
               this.height    === other.height &&
               this.angle     === other.angle &&
               this.translateX=== other.translateX &&
               this.translateY=== other.translateY &&
               types.isEqual(this.img, other.img, aUnionFind) );
    };

    //////////////////////////////////////////////////////////////////////
    // ScaleImage: factor factor image -> image
    // Scale an image
    var ScaleImage = function(xFactor, yFactor, img) {
        BaseImage.call(this);
        var vertices = img.getVertices();
        var xs = [], ys = [];
        for(var i=0; i<vertices.length; i++){
            xs[i] = Math.round(vertices[i].x*xFactor);
            ys[i] = Math.round(vertices[i].y*yFactor);
        }
        // store the vertices as something private, so this.getVertices() will still return undefined
        this._vertices = zipVertices(xs,ys);
 
        this.img      = img;
        this.width    = Math.floor(img.getWidth() * xFactor);
        this.height   = Math.floor(img.getHeight() * yFactor);
        this.xFactor  = xFactor;
        this.yFactor  = yFactor;
    };

    ScaleImage.prototype = heir(BaseImage.prototype);

    ScaleImage.prototype.getVertices = function() { return this._vertices; };

    // scale the context, and pass it to the image's render function
    ScaleImage.prototype.render = function(ctx, x, y) {
        ctx.save();
        ctx.scale(this.xFactor, this.yFactor);
        this.img.render(ctx, x / this.xFactor, y / this.yFactor);
        ctx.restore();
    };

    ScaleImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof ScaleImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.width     === other.width &&
               this.height    === other.height &&
               this.xFactor   === other.xFactor &&
               this.yFactor   === other.yFactor &&
               types.isEqual(this.img, other.img, aUnionFind) );
    };

    //////////////////////////////////////////////////////////////////////
    // CropImage: startX startY width height image -> image
    // Crop an image
    var CropImage = function(x, y, width, height, img) {
        BaseImage.call(this);
        this.x          = x;
        this.y          = y;
        this.width      = width;
        this.height     = height;
        this.img        = img;
    };

    CropImage.prototype = heir(BaseImage.prototype);

    CropImage.prototype.render = function(ctx, x, y) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, this.width, this.height);
        ctx.clip();
        ctx.translate(-this.x, -this.y);
        this.img.render(ctx, x, y);
        ctx.restore();
    };

    CropImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof CropImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.width     === other.width &&
               this.height    === other.height &&
               this.x         === other.x &&
               this.y         === other.y &&
               types.isEqual(this.img, other.img, aUnionFind) );
    };

    //////////////////////////////////////////////////////////////////////
    // FrameImage: factor factor image -> image
    // Stick a frame around the image
    var FrameImage = function(img) {
        BaseImage.call(this);
        this.img        = img;
        this.width      = img.getWidth();
        this.height     = img.getHeight();
    };

    FrameImage.prototype = heir(BaseImage.prototype);

    // scale the context, and pass it to the image's render function
    FrameImage.prototype.render = function(ctx, x, y) {
        ctx.save();
        this.img.render(ctx, x, y);
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.strokeRect(x, y, this.width, this.height);
        ctx.closePath();
        ctx.restore();
    };

    FrameImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof FrameImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (types.isEqual(this.img, other.img, aUnionFind) );
    };

    //////////////////////////////////////////////////////////////////////
    // FlipImage: image string -> image
    // Flip an image either horizontally or vertically
    var FlipImage = function(img, direction) {
        BaseImage.call(this);
        this.img        = img;
        this.width      = img.getWidth();
        this.height     = img.getHeight();
        this.direction  = direction;
    };

    FlipImage.prototype = heir(BaseImage.prototype);

    FlipImage.prototype.render = function(ctx, x, y) {
        // when flipping an image of dimension M and offset by N across an axis, 
        // we need to translate the canvas by M+2N in the opposite direction
        ctx.save();
        if(this.direction === "horizontal"){
            ctx.scale(-1, 1);
            ctx.translate(-(this.width+2*x), 0);
            this.img.render(ctx, x, y);
        }
        if (this.direction === "vertical"){
            ctx.scale(1, -1);
            ctx.translate(0, -(this.height+2*y));
            this.img.render(ctx, x, y);
        }
        ctx.restore();
    };

    FlipImage.prototype.getWidth = function() {
        return this.width;
    };

    FlipImage.prototype.getHeight = function() {
        return this.height;
    };

    FlipImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof FlipImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.width     === other.width &&
               this.height    === other.height &&
               this.direction === other.direction &&
               types.isEqual(this.img, other.img, aUnionFind) );
    };


    //////////////////////////////////////////////////////////////////////
    // colorString : hexColor Style -> rgba
    // Style can be "solid" (1.0), "outline" (1.0), a number (0-1.0) or null (1.0)
    var colorString = function(aColor, aStyle) {
      var alpha = isNaN(aStyle)? 1.0 : aStyle/255;
      return "rgba(" + types.colorRed(aColor) + "," +
                      types.colorGreen(aColor) + ", " +
                      types.colorBlue(aColor) + ", " +
                      alpha + ")";
    };

    //////////////////////////////////////////////////////////////////////
    // RectangleImage: Number Number Mode Color -> Image
    var RectangleImage = function(width, height, style, color) {
        BaseImage.call(this);
        this.width  = width;
        this.height = height;
        this.style  = style;
        this.color  = color;
        this.vertices = [{x:0,y:height},{x:0,y:0},{x:width,y:0},{x:width,y:height}];
    };
    RectangleImage.prototype = heir(BaseImage.prototype);

    RectangleImage.prototype.getWidth = function() {
        return this.width;
    };

    RectangleImage.prototype.getHeight = function() {
        return this.height;
    };
 
    //////////////////////////////////////////////////////////////////////
    // RhombusImage: Number Number Mode Color -> Image
    var RhombusImage = function(side, angle, style, color) {
        BaseImage.call(this);
        // sin(angle/2-in-radians) * side = half of base
        // cos(angle/2-in-radians) * side = half of height
        this.width  = Math.sin(angle/2 * Math.PI / 180) * side * 2;
        this.height = Math.abs(Math.cos(angle/2 * Math.PI / 180)) * side * 2;
        this.side   = side;
        this.angle  = angle;
        this.style  = style;
        this.color  = color;
        this.vertices = [{x:this.width/2, y:0},
                         {x:this.width,   y:this.height/2},
                         {x:this.width/2, y:this.height},
                         {x:0,            y:this.height/2}];

    };
    RhombusImage.prototype = heir(BaseImage.prototype);

    RhombusImage.prototype.getWidth = function() {
        return this.width;
    };

    RhombusImage.prototype.getHeight = function() {
        return this.height;
    };

    //////////////////////////////////////////////////////////////////////
    // PolygonImage: Number Count Step Mode Color -> Image
    //
    // See http://www.algebra.com/algebra/homework/Polygons/Inscribed-and-circumscribed-polygons.lesson
    // the polygon is inscribed in a circle, whose radius is length/2sin(pi/count)
    // another circle is inscribed in the polygon, whose radius is length/2tan(pi/count)
    // rotate a 3/4 quarter turn plus half the angle length to keep bottom base level
    var PolygonImage = function(length, count, step, style, color) {
        BaseImage.call(this);
        this.outerRadius = Math.floor(length/(2*Math.sin(Math.PI/count)));
        this.innerRadius = Math.floor(length/(2*Math.tan(Math.PI/count)));
        var adjust = (3*Math.PI/2)+Math.PI/count;
        
        // rotate around outer circle, storing x and y coordinates
        var radians = 0, xs = [], ys = [];
        for(var i = 0; i < count; i++) {
            radians = radians + (step*2*Math.PI/count);
            xs.push(Math.round(this.outerRadius*Math.cos(radians-adjust)));
            ys.push(Math.round(this.outerRadius*Math.sin(radians-adjust)));
        }
        var vertices = zipVertices(xs, ys);

        this.width      = Math.max.apply(Math, xs) - Math.min.apply(Math, xs);
        this.height     = Math.max.apply(Math, ys) - Math.min.apply(Math, ys);
        this.length     = length;
        this.count      = count;
        this.step       = step;
        this.style      = style;
        this.color      = color;
 
        // shift the vertices by the calculated offsets, now that we know the width
        var xOffset = Math.round(this.width/2);
        var yOffset = ((this.count % 2)? this.outerRadius : this.innerRadius);
        for(i=0; i<vertices.length; i++){
            vertices[i].x += xOffset; vertices[i].y += yOffset;
        }
        this.vertices   = vertices;
    };
 
    PolygonImage.prototype = heir(BaseImage.prototype);

    var maybeQuote = function(s) {
        if (/ /.test(s)) {
            return "\"" + s + "\"";
        }
        return s;
    };

    //////////////////////////////////////////////////////////////////////
    // TextImage: String Number Color String String String String any/c -> Image
    var TextImage = function(msg, size, color, face, family, style, weight, underline) {        
        BaseImage.call(this);
        var metrics;
        this.msg        = msg;
        this.size       = size;   // 18
        this.color      = color;  // red
        this.face       = face;   // Gill Sans
        this.family     = family; // 'swiss
        this.style      = (style === "slant")? "oblique" : style;  // Racket's "slant" -> CSS's "oblique"
        this.weight     = (weight=== "light")? "lighter" : weight; // Racket's "light" -> CSS's "lighter"
        this.underline  = underline;
        // example: "bold italic 20px 'Times', sans-serif". 
        // Default weight is "normal", face is "Arial"
 
        // NOTE: we *ignore* font-family, as it causes a number of font bugs due the browser inconsistencies
        var canvas      = world.Kernel.makeCanvas(0, 0),
            ctx         = canvas.getContext("2d");
 
        this.font = (this.style + " " +
                     this.weight + " " +
                     this.size + "px " +
                     '"'+this.face+'", '+
                     this.family);
 
        try {
            ctx.font    = this.font;
        } catch (e) {
            this.fallbackOnFont();
            ctx.font    = this.font;
        }
        
        // Defensive: on IE, this can break.
        try {
            metrics     = ctx.measureText(msg);
            this.width  = metrics.width;
            this.height = Number(this.size); 
        } catch(e) {
            this.fallbackOnFont();
        }
    };
 

    TextImage.prototype = heir(BaseImage.prototype);

    TextImage.prototype.fallbackOnFont = function() {
        // Defensive: if the browser doesn't support certain features, we
        // reduce to a smaller feature set and try again.
        this.font       = this.size + "px " + maybeQuote(this.family);    
        var canvas      = world.Kernel.makeCanvas(0, 0);
        var ctx         = canvas.getContext("2d");
        ctx.font        = this.font;
        var metrics     = ctx.measureText(this.msg);
        this.width      = metrics.width;
        // KLUDGE: I don't know how to get at the height.
        this.height     = Number(this.size);//ctx.measureText("m").width + 20;
    };


    TextImage.prototype.render = function(ctx, x, y) {
        ctx.save();
        ctx.textAlign   = 'left';
        ctx.textBaseline= 'top';
        ctx.fillStyle   = colorString(this.color);
        ctx.font        = this.font;
        try { 
            ctx.fillText(this.msg, x, y); 
        } catch (e) {
            this.fallbackOnFont();
            ctx.font = this.font;    
            ctx.fillText(this.msg, x, y); 
        }
        if(this.underline){
            ctx.beginPath();
            ctx.moveTo(x, y+this.size);
            // we use this.size, as it is more accurate for underlining than this.height
            ctx.lineTo(x+this.width, y+this.size);
            ctx.closePath();
            ctx.strokeStyle = colorString(this.color);
            ctx.stroke();
        }
        ctx.restore();
    };

    TextImage.prototype.getBaseline = function() {
        return this.size;
    };

    TextImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof TextImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.msg      === other.msg &&
                this.size     === other.size &&
                this.face     === other.face &&
                this.family   === other.family &&
                this.style    === other.style &&
                this.weight   === other.weight &&
                this.underline === other.underline &&
                types.isEqual(this.color, other.color, aUnionFind) &&
                this.font === other.font);
    };


    //////////////////////////////////////////////////////////////////////
    // StarImage: fixnum fixnum fixnum color -> image
    // Most of this code here adapted from the Canvas tutorial at:
    // http://developer.apple.com/safari/articles/makinggraphicswithcanvas.html
    var StarImage = function(points, outer, inner, style, color) {
        BaseImage.call(this);
        this.points     = points;
        this.outer      = outer;
        this.inner      = inner;
        this.style      = style;
        this.color      = color;
        this.radius     = Math.max(this.inner, this.outer);
        this.width      = this.radius*2;
        this.height     = this.radius*2;
        var vertices   = [];
 
        var oneDegreeAsRadian = Math.PI / 180;
        for(var pt = 0; pt < (this.points * 2) + 1; pt++ ) {
          var rads = ( ( 360 / (2 * this.points) ) * pt ) * oneDegreeAsRadian - 0.5;
          var radius = ( pt % 2 === 1 ) ? this.outer : this.inner;
          vertices.push({x:this.radius + ( Math.sin( rads ) * radius ),
                         y:this.radius + ( Math.cos( rads ) * radius )} );
        }
        this.vertices = vertices;
    };

    StarImage.prototype = heir(BaseImage.prototype);

     /////////////////////////////////////////////////////////////////////
     //TriangleImage: Number Number Number Mode Color -> Image
     // Draws a triangle with the base = sideC, and the angle between sideC
     // and sideB being angleA
     // See http://docs.racket-lang.org/teachpack/2htdpimage.html#(def._((lib._2htdp/image..rkt)._triangle))
     var TriangleImage = function(sideC, angleA, sideB, style, color) {
       BaseImage.call(this);
       this.width = sideC;
       this.height = sideB*Math.sin(angleA*Math.PI/180);
       
       var xs = [], ys = [];
       // if angle < 180 start at the top of the canvas,
       // otherwise start at the bottom and use negative height
       if(angleA < 180){
         xs = [0, sideC, sideB*Math.cos(angleA*Math.PI/180)];
         ys = [0, 0, this.height];
       } else {
         xs = [0, sideC, Math.abs(sideB*Math.cos(angleA*Math.PI/180))];
         ys = [-this.height, -this.height, 0];
       }
       this.vertices = zipVertices(xs, ys);
 
       // take obtuse triangles into account, which may have vertices out of the range of base
       var xMin = Math.min.apply(Math, xs ), yMin = Math.min.apply(Math, ys),
           xMax = Math.max.apply(Math, xs ), yMax = Math.max.apply(Math, ys);
       this.width  = xMax-xMin;
       this.height = yMax-yMin;
       for(var i=0; i<this.vertices.length; i++){
         this.vertices[i].x -= xMin; this.vertices[i].y -= yMin;
       }
 
       this.style = style;
       this.color = color;
     };
     TriangleImage.prototype = heir(BaseImage.prototype);

    //////////////////////////////////////////////////////////////////////
    //Ellipse : Number Number Mode Color -> Image
    var EllipseImage = function(width, height, style, color) {
        BaseImage.call(this);
        this.width = width;
        this.height = height;
        this.style = style;
        this.color = color;
    };

    EllipseImage.prototype = heir(BaseImage.prototype);

    EllipseImage.prototype.render = function(ctx, aX, aY) {
        ctx.save();
        ctx.beginPath();

        // Most of this code is taken from:
        // http://webreflection.blogspot.com/2009/01/ellipse-and-circle-for-canvas-2d.html
        var hB = (this.width / 2) * 0.5522848,
        vB = (this.height / 2) * 0.5522848,
        eX = aX + this.width,
        eY = aY + this.height,
        mX = aX + this.width / 2,
        mY = aY + this.height / 2;
        ctx.moveTo(aX, mY);
        ctx.bezierCurveTo(aX, mY - vB, mX - hB, aY, mX, aY);
        ctx.bezierCurveTo(mX + hB, aY, eX, mY - vB, eX, mY);
        ctx.bezierCurveTo(eX, mY + vB, mX + hB, eY, mX, eY);
        ctx.bezierCurveTo(mX - hB, eY, aX, mY + vB, aX, mY);
        ctx.closePath();
        if (this.style.toString().toLowerCase() === "outline") {
            ctx.strokeStyle = colorString(this.color);
            ctx.stroke();
        }
        else {
            ctx.fillStyle = colorString(this.color, this.style);
            ctx.fill();
        }

        ctx.restore();
    };

    EllipseImage.prototype.isEqual = function(other, aUnionFind) {
         if (!(other instanceof EllipseImage)) {
            return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
         }
         return (this.width    === other.width &&
                this.height   === other.height &&
                this.style    === other.style &&
                types.isEqual(this.color, other.color, aUnionFind));
    };


    //////////////////////////////////////////////////////////////////////
    // Line: Number Number Color Boolean -> Image
    var LineImage = function(x, y, color) {
        BaseImage.call(this);
        var vertices;
        if (x >= 0) {
            if (y >= 0) { vertices = [{x:  0, y:  0}, {x: x, y: y}]; }
            else        { vertices = [{x:  0, y: -y}, {x: x, y: 0}]; }
        } else {
            if (y >= 0) { vertices = [{x: -x, y:  0}, {x: 0, y: y}]; }
            else        { vertices = [{x: -x, y: -y}, {x: 0, y: 0}]; }
        }
        // preserve the invariant that all vertex-based images have a style
        this.style  = "outline";
        this.color  = color;
        this.width  = Math.abs(x);
        this.height = Math.abs(y);
        this.vertices = vertices;
    };

    LineImage.prototype = heir(BaseImage.prototype);

    //////////////////////////////////////////////////////////////////////
    // Effects

    /**
     * applyEffect: compound-effect -> (arrayof (world -> world))

     applyEffect applies all of the effects

     @param aCompEffect a compound effect is either a scheme list of
     compound effects or a single primitive effect */
    world.Kernel.applyEffect = function(aCompEffect) {
        if (aCompEffect === types.EMPTY) {
            // Do Nothing
        } else if ( types.isPair(aCompEffect) ) {
            var results = world.Kernel.applyEffect(aCompEffect.first);
            return results.concat(world.Kernel.applyEffect(aCompEffect.rest));
        } else {
            var newResult = aCompEffect.run();
            if (newResult) {
                return newResult;
            }
        }
        return [];
    };

    //////////////////////////////////////////////////////////////////////////
    // Color database
    var ColorDb = function() {
        this.colors = {};
    };
    ColorDb.prototype.put = function(name, color) {
        this.colors[name] = color;
    };

    ColorDb.prototype.get = function(name) {
        return this.colors[name.toString().toUpperCase()];
    };


    // FIXME: update toString to handle the primitive field values.
    var colorDb = new ColorDb();
    colorDb.put("ORANGE", types.color(255, 165, 0));
    colorDb.put("RED", types.color(255, 0, 0));
    colorDb.put("ORANGERED", types.color(255, 69, 0));
    colorDb.put("TOMATO", types.color(255, 99, 71));
    colorDb.put("DARKRED", types.color(139, 0, 0));
    colorDb.put("RED", types.color(255, 0, 0));
    colorDb.put("FIREBRICK", types.color(178, 34, 34));
    colorDb.put("CRIMSON", types.color(220, 20, 60));
    colorDb.put("DEEPPINK", types.color(255, 20, 147));
    colorDb.put("MAROON", types.color(176, 48, 96));
    colorDb.put("INDIAN RED", types.color(205, 92, 92));
    colorDb.put("INDIANRED", types.color(205, 92, 92));
    colorDb.put("MEDIUM VIOLET RED", types.color(199, 21, 133));
    colorDb.put("MEDIUMVIOLETRED", types.color(199, 21, 133));
    colorDb.put("VIOLET RED", types.color(208, 32, 144));
    colorDb.put("VIOLETRED", types.color(208, 32, 144));
    colorDb.put("LIGHTCORAL", types.color(240, 128, 128));
    colorDb.put("HOTPINK", types.color(255, 105, 180));
    colorDb.put("PALEVIOLETRED", types.color(219, 112, 147));
    colorDb.put("LIGHTPINK", types.color(255, 182, 193));
    colorDb.put("ROSYBROWN", types.color(188, 143, 143));
    colorDb.put("PINK", types.color(255, 192, 203));
    colorDb.put("ORCHID", types.color(218, 112, 214));
    colorDb.put("LAVENDERBLUSH", types.color(255, 240, 245));
    colorDb.put("SNOW", types.color(255, 250, 250));
    colorDb.put("CHOCOLATE", types.color(210, 105, 30));
    colorDb.put("SADDLEBROWN", types.color(139, 69, 19));
    colorDb.put("BROWN", types.color(132, 60, 36));
    colorDb.put("DARKORANGE", types.color(255, 140, 0));
    colorDb.put("CORAL", types.color(255, 127, 80));
    colorDb.put("SIENNA", types.color(160, 82, 45));
    colorDb.put("ORANGE", types.color(255, 165, 0));
    colorDb.put("SALMON", types.color(250, 128, 114));
    colorDb.put("PERU", types.color(205, 133, 63));
    colorDb.put("DARKGOLDENROD", types.color(184, 134, 11));
    colorDb.put("GOLDENROD", types.color(218, 165, 32));
    colorDb.put("SANDYBROWN", types.color(244, 164, 96));
    colorDb.put("LIGHTSALMON", types.color(255, 160, 122));
    colorDb.put("DARKSALMON", types.color(233, 150, 122));
    colorDb.put("GOLD", types.color(255, 215, 0));
    colorDb.put("YELLOW", types.color(255, 255, 0));
    colorDb.put("OLIVE", types.color(128, 128, 0));
    colorDb.put("BURLYWOOD", types.color(222, 184, 135));
    colorDb.put("TAN", types.color(210, 180, 140));
    colorDb.put("NAVAJOWHITE", types.color(255, 222, 173));
    colorDb.put("PEACHPUFF", types.color(255, 218, 185));
    colorDb.put("KHAKI", types.color(240, 230, 140));
    colorDb.put("DARKKHAKI", types.color(189, 183, 107));
    colorDb.put("MOCCASIN", types.color(255, 228, 181));
    colorDb.put("WHEAT", types.color(245, 222, 179));
    colorDb.put("BISQUE", types.color(255, 228, 196));
    colorDb.put("PALEGOLDENROD", types.color(238, 232, 170));
    colorDb.put("BLANCHEDALMOND", types.color(255, 235, 205));
    colorDb.put("MEDIUM GOLDENROD", types.color(234, 234, 173));
    colorDb.put("MEDIUMGOLDENROD", types.color(234, 234, 173));
    colorDb.put("PAPAYAWHIP", types.color(255, 239, 213));
    colorDb.put("MISTYROSE", types.color(255, 228, 225));
    colorDb.put("LEMONCHIFFON", types.color(255, 250, 205));
    colorDb.put("ANTIQUEWHITE", types.color(250, 235, 215));
    colorDb.put("CORNSILK", types.color(255, 248, 220));
    colorDb.put("LIGHTGOLDENRODYELLOW", types.color(250, 250, 210));
    colorDb.put("OLDLACE", types.color(253, 245, 230));
    colorDb.put("LINEN", types.color(250, 240, 230));
    colorDb.put("LIGHTYELLOW", types.color(255, 255, 224));
    colorDb.put("SEASHELL", types.color(255, 245, 238));
    colorDb.put("BEIGE", types.color(245, 245, 220));
    colorDb.put("FLORALWHITE", types.color(255, 250, 240));
    colorDb.put("IVORY", types.color(255, 255, 240));
    colorDb.put("GREEN", types.color(0, 255, 0));
    colorDb.put("LAWNGREEN", types.color(124, 252, 0));
    colorDb.put("CHARTREUSE", types.color(127, 255, 0));
    colorDb.put("GREEN YELLOW", types.color(173, 255, 47));
    colorDb.put("GREENYELLOW", types.color(173, 255, 47));
    colorDb.put("YELLOW GREEN", types.color(154, 205, 50));
    colorDb.put("YELLOWGREEN", types.color(154, 205, 50));
    colorDb.put("MEDIUM FOREST GREEN", types.color(107, 142, 35));
    colorDb.put("OLIVEDRAB", types.color(107, 142, 35));
    colorDb.put("MEDIUMFORESTGREEN", types.color(107, 142, 35));
    colorDb.put("DARK OLIVE GREEN", types.color(85, 107, 47));
    colorDb.put("DARKOLIVEGREEN", types.color(85, 107, 47));
    colorDb.put("DARKSEAGREEN", types.color(143, 188, 139));
    colorDb.put("LIME", types.color(0, 255, 0));
    colorDb.put("DARK GREEN", types.color(0, 100, 0));
    colorDb.put("DARKGREEN", types.color(0, 100, 0));
    colorDb.put("LIME GREEN", types.color(50, 205, 50));
    colorDb.put("LIMEGREEN", types.color(50, 205, 50));
    colorDb.put("FOREST GREEN", types.color(34, 139, 34));
    colorDb.put("FORESTGREEN", types.color(34, 139, 34));
    colorDb.put("SPRING GREEN", types.color(0, 255, 127));
    colorDb.put("SPRINGGREEN", types.color(0, 255, 127));
    colorDb.put("MEDIUM SPRING GREEN", types.color(0, 250, 154));
    colorDb.put("MEDIUMSPRINGGREEN", types.color(0, 250, 154));
    colorDb.put("SEA GREEN", types.color(46, 139, 87));
    colorDb.put("SEAGREEN", types.color(46, 139, 87));
    colorDb.put("MEDIUM SEA GREEN", types.color(60, 179, 113));
    colorDb.put("MEDIUMSEAGREEN", types.color(60, 179, 113));
    colorDb.put("AQUAMARINE", types.color(112, 216, 144));
    colorDb.put("LIGHTGREEN", types.color(144, 238, 144));
    colorDb.put("PALE GREEN", types.color(152, 251, 152));
    colorDb.put("PALEGREEN", types.color(152, 251, 152));
    colorDb.put("MEDIUM AQUAMARINE", types.color(102, 205, 170));
    colorDb.put("MEDIUMAQUAMARINE", types.color(102, 205, 170));
    colorDb.put("TURQUOISE", types.color(64, 224, 208));
    colorDb.put("LIGHTSEAGREEN", types.color(32, 178, 170));
    colorDb.put("MEDIUM TURQUOISE", types.color(72, 209, 204));
    colorDb.put("MEDIUMTURQUOISE", types.color(72, 209, 204));
    colorDb.put("HONEYDEW", types.color(240, 255, 240));
    colorDb.put("MINTCREAM", types.color(245, 255, 250));
    colorDb.put("ROYALBLUE", types.color(65, 105, 225));
    colorDb.put("DODGERBLUE", types.color(30, 144, 255));
    colorDb.put("DEEPSKYBLUE", types.color(0, 191, 255));
    colorDb.put("CORNFLOWERBLUE", types.color(100, 149, 237));
    colorDb.put("STEEL BLUE", types.color(70, 130, 180));
    colorDb.put("STEELBLUE", types.color(70, 130, 180));
    colorDb.put("LIGHTSKYBLUE", types.color(135, 206, 250));
    colorDb.put("DARK TURQUOISE", types.color(0, 206, 209));
    colorDb.put("DARKTURQUOISE", types.color(0, 206, 209));
    colorDb.put("CYAN", types.color(0, 255, 255));
    colorDb.put("AQUA", types.color(0, 255, 255));
    colorDb.put("DARKCYAN", types.color(0, 139, 139));
    colorDb.put("TEAL", types.color(0, 128, 128));
    colorDb.put("SKY BLUE", types.color(135, 206, 235));
    colorDb.put("SKYBLUE", types.color(135, 206, 235));
    colorDb.put("CADET BLUE", types.color(96, 160, 160));
    colorDb.put("CADETBLUE", types.color(95, 158, 160));
    colorDb.put("DARK SLATE GRAY", types.color(47, 79, 79));
    colorDb.put("DARKSLATEGRAY", types.color(47, 79, 79));
    colorDb.put("LIGHTSLATEGRAY", types.color(119, 136, 153));
    colorDb.put("SLATEGRAY", types.color(112, 128, 144));
    colorDb.put("LIGHT STEEL BLUE", types.color(176, 196, 222));
    colorDb.put("LIGHTSTEELBLUE", types.color(176, 196, 222));
    colorDb.put("LIGHT BLUE", types.color(173, 216, 230));
    colorDb.put("LIGHTBLUE", types.color(173, 216, 230));
    colorDb.put("POWDERBLUE", types.color(176, 224, 230));
    colorDb.put("PALETURQUOISE", types.color(175, 238, 238));
    colorDb.put("LIGHTCYAN", types.color(224, 255, 255));
    colorDb.put("ALICEBLUE", types.color(240, 248, 255));
    colorDb.put("AZURE", types.color(240, 255, 255));
    colorDb.put("MEDIUM BLUE", types.color(0, 0, 205));
    colorDb.put("MEDIUMBLUE", types.color(0, 0, 205));
    colorDb.put("DARKBLUE", types.color(0, 0, 139));
    colorDb.put("MIDNIGHT BLUE", types.color(25, 25, 112));
    colorDb.put("MIDNIGHTBLUE", types.color(25, 25, 112));
    colorDb.put("NAVY", types.color(36, 36, 140));
    colorDb.put("BLUE", types.color(0, 0, 255));
    colorDb.put("INDIGO", types.color(75, 0, 130));
    colorDb.put("BLUE VIOLET", types.color(138, 43, 226));
    colorDb.put("BLUEVIOLET", types.color(138, 43, 226));
    colorDb.put("MEDIUM SLATE BLUE", types.color(123, 104, 238));
    colorDb.put("MEDIUMSLATEBLUE", types.color(123, 104, 238));
    colorDb.put("SLATE BLUE", types.color(106, 90, 205));
    colorDb.put("SLATEBLUE", types.color(106, 90, 205));
    colorDb.put("PURPLE", types.color(160, 32, 240));
    colorDb.put("DARK SLATE BLUE", types.color(72, 61, 139));
    colorDb.put("DARKSLATEBLUE", types.color(72, 61, 139));
    colorDb.put("DARKVIOLET", types.color(148, 0, 211));
    colorDb.put("DARK ORCHID", types.color(153, 50, 204));
    colorDb.put("DARKORCHID", types.color(153, 50, 204));
    colorDb.put("MEDIUMPURPLE", types.color(147, 112, 219));
    colorDb.put("CORNFLOWER BLUE", types.color(68, 64, 108));
    colorDb.put("MEDIUM ORCHID", types.color(186, 85, 211));
    colorDb.put("MEDIUMORCHID", types.color(186, 85, 211));
    colorDb.put("MAGENTA", types.color(255, 0, 255));
    colorDb.put("FUCHSIA", types.color(255, 0, 255));
    colorDb.put("DARKMAGENTA", types.color(139, 0, 139));
    colorDb.put("VIOLET", types.color(238, 130, 238));
    colorDb.put("PLUM", types.color(221, 160, 221));
    colorDb.put("LAVENDER", types.color(230, 230, 250));
    colorDb.put("THISTLE", types.color(216, 191, 216));
    colorDb.put("GHOSTWHITE", types.color(248, 248, 255));
    colorDb.put("WHITE", types.color(255, 255, 255));
    colorDb.put("WHITESMOKE", types.color(245, 245, 245));
    colorDb.put("GAINSBORO", types.color(220, 220, 220));
    colorDb.put("LIGHT GRAY", types.color(211, 211, 211));
    colorDb.put("LIGHTGRAY", types.color(211, 211, 211));
    colorDb.put("SILVER", types.color(192, 192, 192));
    colorDb.put("GRAY", types.color(190, 190, 190));
    colorDb.put("DARK GRAY", types.color(169, 169, 169));
    colorDb.put("DARKGRAY", types.color(169, 169, 169));
    colorDb.put("DIM GRAY", types.color(105, 105, 105));
    colorDb.put("DIMGRAY", types.color(105, 105, 105));
    colorDb.put("BLACK", types.color(0, 0, 0));


    var nameToColor = function(s) {
        return colorDb.get('' + s);
    };



    ///////////////////////////////////////////////////////////////
    // Exports

    world.Kernel.isImage = isImage;
    world.Kernel.isScene = isScene;
    world.Kernel.isColor = function(thing) {
        return (types.isColor(thing) ||
                ((types.isString(thing) || types.isSymbol(thing)) &&
                 typeof(colorDb.get(thing)) !== 'undefined'));
    };
    world.Kernel.nameToColor = nameToColor;
    world.Kernel.colorDb = colorDb;

    world.Kernel.sceneImage = function(width, height, children, withBorder) {
        return new SceneImage(width, height, children, withBorder);
    };
    world.Kernel.circleImage = function(radius, style, color) {
        return new EllipseImage(2*radius, 2*radius, style, color);
    };
    world.Kernel.starImage = function(points, outer, inner, style, color) {
        return new StarImage(points, outer, inner, style, color);
    };
    world.Kernel.rectangleImage = function(width, height, style, color) {
        return new RectangleImage(width, height, style, color);
    };
    world.Kernel.rhombusImage = function(side, angle, style, color) {
        return new RhombusImage(side, angle, style, color);
    };
    world.Kernel.polygonImage = function(length, count, step, style, color) {
        return new PolygonImage(length, count, step, style, color);
    };
    world.Kernel.squareImage = function(length, style, color) {
        return new RectangleImage(length, length, style, color);
    };
    world.Kernel.triangleImage = function(side, angle, side2, style, color) {
        return new TriangleImage(side, angle, side2, style, color);
    };
    world.Kernel.ellipseImage = function(width, height, style, color) {
        return new EllipseImage(width, height, style, color);
    };
    world.Kernel.lineImage = function(x, y, color) {
        return new LineImage(x, y, color);
    };
    world.Kernel.overlayImage = function(img1, img2, X, Y) {
        return new OverlayImage(img1, img2, X, Y);
    };
    world.Kernel.rotateImage = function(angle, img) {
        return new RotateImage(angle, img);
    };
    world.Kernel.scaleImage = function(xFactor, yFactor, img) {
        return new ScaleImage(xFactor, yFactor, img);
    };
    world.Kernel.cropImage = function(x, y, width, height, img) {
        return new CropImage(x, y, width, height, img);
    };
    world.Kernel.frameImage = function(img) {
        return new FrameImage(img);
    };
    world.Kernel.flipImage = function(img, direction) {
        return new FlipImage(img, direction);
    };
    world.Kernel.textImage = function(msg, size, color, face, family, style, weight, underline) {
        return new TextImage(msg, size, color, face, family, style, weight, underline);
    };
    world.Kernel.fileImage = function(path, rawImage, afterInit) {
        return FileImage.makeInstance(path, rawImage, afterInit);
    };
    world.Kernel.fileVideo = function(path, rawVideo) {
        return FileVideo.makeInstance(path, rawVideo);
    };

    world.Kernel.isSceneImage   = function(x) { return x instanceof SceneImage; };
    world.Kernel.isStarImage    = function(x) { return x instanceof StarImage; };
    world.Kernel.isRectangleImage=function(x) { return x instanceof RectangleImage; };
    world.Kernel.isPolygonImage = function(x) { return x instanceof PolygonImage; };
    world.Kernel.isRhombusImage = function(x) { return x instanceof RhombusImage; };
    world.Kernel.isTriangleImage= function(x) { return x instanceof TriangleImage; };
    world.Kernel.isEllipseImage = function(x) { return x instanceof EllipseImage; };
    world.Kernel.isLineImage    = function(x) { return x instanceof LineImage; };
    world.Kernel.isOverlayImage = function(x) { return x instanceof OverlayImage; };
    world.Kernel.isRotateImage  = function(x) { return x instanceof RotateImage; };
    world.Kernel.isScaleImage   = function(x) { return x instanceof ScaleImage; };
    world.Kernel.isCropImage    = function(x) { return x instanceof CropImage; };
    world.Kernel.isFrameImage   = function(x) { return x instanceof FrameImage; };
    world.Kernel.isFlipImage    = function(x) { return x instanceof FlipImage; };
    world.Kernel.isTextImage    = function(x) { return x instanceof TextImage; };
    world.Kernel.isFileImage    = function(x) { return x instanceof FileImage; };
    world.Kernel.isFileVideo    = function(x) { return x instanceof FileVideo; };

})();
