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
            if (obj.hasOwnProperty(property)) {
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
 
    // Base class for all images.
    var BaseImage = function(pinholeX, pinholeY,vertices) {
        this.pinholeX = pinholeX;
        this.pinholeY = pinholeY;
        this.vertices = vertices || [];
    };
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

    // render: context fixnum fixnum: -> void
    // Render the image, where the upper-left corner of the image is drawn at
    // (x, y).
    // NOTE: the rendering should be oblivous to the pinhole.
    // If the image isn't vertex-based, throw an error
    // Otherwise, stroke and fill the vertices.
    BaseImage.prototype.render = function(ctx, x, y) {
        if(this.vertices.length == 0){
            throw new Error('BaseImage.render unimplemented!');
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
        canvas.width = width;
        canvas.height = height;

        canvas.style.width = canvas.width + "px";
        canvas.style.height = canvas.height + "px";
        
        // KLUDGE: IE compatibility uses /js/excanvas.js, and dynamic
        // elements must be marked this way.
        if (window && typeof window.G_vmlCanvasManager !== 'undefined') {
            canvas = window.G_vmlCanvasManager.initElement(canvas);
        }
        return canvas;
    };



    var withIeHack = function(canvas, f) {
        //      canvas.style.display = 'none';
        //      document.body.appendChild(canvas);
        //      try {
        var result = f(canvas);
        //      } catch(e) {
        //          document.body.removeChild(canvas);
        //          canvas.style.display = '';
        //          throw e;
        //      }
        //      document.body.removeChild(canvas);
        //      canvas.style.display = '';
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

    // will two Images produce pixel-equivalent canvases?
    BaseImage.prototype.isEqual = function(other, aUnionFind) {
      var c1 = this.toDomNode(), c2 = other.toDomNode();
      // compare canvas dimensions
      if(c1.width !== c2.width || c1.height !== c2.height){ return false;}
      var ctx1 = c1.getContext('2d'), ctx2 = c2.getContext('2d'),
          data1 = ctx1.getImageData(0, 0, c1.width, c1.height),
          data2 = ctx1.getImageData(0, 0, c2.width, c2.height),
          pixels1 = data1.data,
          pixels2 = data2.data;
      // compare # of pixels
      if(pixels1.length !== pixels2.length){ return false;}
      // compare their pixels one by one
      for(var i = 0; i < pixels1.length; i++){
          if(pixels1[i] !== pixels2[i]){ return false; }
      }
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
        var vertices = [{x:0,y:0},{x:width,y:0},{x:width,y:height}, {x:0,y:height}];
        BaseImage.call(this, Math.floor(width/2), Math.floor(height/2), vertices);
        this.width = width;
        this.height = height;
        this.children = children; // arrayof [image, number, number]
        this.withBorder = withBorder;
    };
    SceneImage.prototype = heir(BaseImage.prototype);


    // add: image primitive-number primitive-number -> Scene
    SceneImage.prototype.add = function(anImage, x, y) {
        return new SceneImage(this.width, 
                              this.height,
                              this.children.concat([[anImage, 
                                                     x - anImage.pinholeX, 
                                                     y - anImage.pinholeY]]),
                              this.withBorder);
    };

    // render: 2d-context primitive-number primitive-number -> void
    SceneImage.prototype.render = function(ctx, x, y) {
        var i;
        var childImage, childX, childY;
        // Clear the scene.
        ctx.clearRect(x, y, this.width, this.height);
        // Then ask every object to render itself.
        for(i = 0; i < this.children.length; i++) {
            childImage = this.children[i][0];
            childX = this.children[i][1];
            childY = this.children[i][2];
            ctx.save();
            childImage.render(ctx, childX + x, childY + y);
            ctx.restore();
        }
        // Finally, draw the black border if withBorder is true
        if (this.withBorder) {
            ctx.strokeStyle = 'black';
            ctx.strokeRect(x, y, this.width, this.height);
        }
    };

    // use pixel equality if we have to, otherwise use structural equality
    SceneImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof SceneImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }

        if (this.pinholeX !== other.pinholeX ||
            this.pinholeY !== other.pinholeY ||
            this.width    !== other.width ||
            this.height   !== other.height ||
            this.children.length !== other.children.length) {
            return false;
        }

        for (var i = 0; i < this.children.length; i++) {
            var rec1 = this.children[i];
            var rec2 = other.children[i];
            if (rec1[1] !== rec2[1] ||
                rec1[2] !== rec2[2] ||
                !types.isEqual(rec1[0], 
                               rec2[0],
                               aUnionFind)) {
                return false;
            }
        }
        return true;
    };


    //////////////////////////////////////////////////////////////////////
    // FileImage: string node -> Image
    var FileImage = function(src, rawImage, afterInit) {
        BaseImage.call(this, 0, 0);
        var self = this;
        this.src = src;
        this.isLoaded = false;

        // animationHack: see installHackToSupportAnimatedGifs() for details.
        this.animationHackImg = undefined;

        if (rawImage && rawImage.complete) { 
            this.img = rawImage;
            this.isLoaded = true;
            this.pinholeX = self.img.width / 2;
            this.pinholeY = self.img.height / 2;
        } else {
            // fixme: we may want to do something blocking here for
            // onload, since we don't know at this time what the file size
            // should be, nor will drawImage do the right thing until the
            // file is loaded.
            this.img = new Image();
            this.img.onload = function() {
                self.isLoaded = true;
                self.pinholeX = self.img.width / 2;
                self.pinholeY = self.img.height / 2;
                self.vertices = [{x:0,y:0},
                                 {x:self.img.width,y:0},
                                 {x:self.img.width,y:self.img.height},
                                 {x:0,y:self.img.height}];

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
                                         "normal", "Optimer","","",false);
    };


    FileImage.prototype.render = function(ctx, x, y) {    
        ctx.drawImage(this.animationHackImg, x, y);
    };


    // The following is a hack that we use to allow animated gifs to show
    // as animating on the canvas.
    FileImage.prototype.installHackToSupportAnimatedGifs = function(afterInit) {
        var that = this;
        this.animationHackImg = this.img.cloneNode(true);
        document.body.appendChild(this.animationHackImg);
        this.animationHackImg.width = 0;
        this.animationHackImg.height = 0;
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

    // Override toDomNode: we don't need a full-fledged canvas here, and
    // we want to clone the image so that we can have multiple instances
    // of the image attached to a document.
    FileImage.prototype.toDomNode = function(cache) {
        return this.img.cloneNode(true);
    };
 
    // use pixel equality if we have to, otherwise use structural equality
    FileImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof FileImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }

        return (this.pinholeX === other.pinholeX &&
                this.pinholeY === other.pinholeY &&
                this.src      === other.src);
    };

    //////////////////////////////////////////////////////////////////////
    // fileVideo: String Node -> Video
    var FileVideo = function(src, rawVideo) {
        BaseImage.call(this, 0, 0);
        var self = this;
        this.src = src;
        if (rawVideo) { 
            this.video                  = rawVideo;
            this.width                  = self.video.videoWidth;
            this.height                 = self.video.videoHeight;
            this.pinholeX               = self.width / 2;
            this.pinholeY               = self.height / 2;
            this.video.volume   = 1;
            this.video.poster   = "http://www.wescheme.org/images/broken.png";
            this.video.autoplay = true;
            this.video.autobuffer=true;
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
                this.width                      = self.video.videoWidth;
                this.height                     = self.video.videoHeight;
                this.pinholeX                   = self.width / 2;
                this.pinholeY                   = self.height / 2;
                this.vertices                   = [{x:0,y:0},
                                                  {x:self.video.width,y:0},
                                                  {x:self.video.width,y:self.video.height},
                                                  {x:0,y:self.video.height}];
                this.video.poster       = "http://www.wescheme.org/images/broken.png";
                this.video.autoplay     = true;
                this.video.autobuffer=true;
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
        return (this.pinholeX === other.pinholeX &&
                this.pinholeY === other.pinholeY &&
                this.src      === other.src);
    };


    //////////////////////////////////////////////////////////////////////
    // OverlayImage: image image placeX placeY -> image
    // Creates an image that overlays img1 on top of the
    // other image img2.
    var OverlayImage = function(img1, img2, placeX, placeY) {
        BaseImage.call(this, 0, 0);

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
        // update the height and width of the image
        this.width = Math.floor(Math.max(x1 + img1.getWidth(), x2 + img2.getWidth()) - Math.min(x1, x2));
        this.height = Math.floor(Math.max(y1 + img1.getHeight(), y2 + img2.getHeight()) - Math.min(y1, y2));
        // store the offsets for rendering
        this.x1 = Math.floor(x1);
        this.y1 = Math.floor(y1);
        this.x2 = Math.floor(x2);
        this.y2 = Math.floor(y2);
        this.img1 = img1;
        this.img2 = img2;
    };

    OverlayImage.prototype = heir(BaseImage.prototype);

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
        return (this.pinholeX === other.pinholeX &&
               this.pinholeY  === other.pinholeY &&
               this.width     === other.width &&
               this.height    === other.height &&
               this.img1Dx    === other.img1Dx &&
               this.img1Dy    === other.img1Dy &&
               this.img2Dx    === other.img2Dx &&
               this.img2Dy    === other.img2Dy &&
               types.isEqual(this.img1, other.img1, aUnionFind) &&
               types.isEqual(this.img2, other.img2, aUnionFind) );
    };


    //////////////////////////////////////////////////////////////////////
    // rotate: angle image -> image
    // Rotates image by angle degrees in a counter-clockwise direction.
    // based on http://stackoverflow.com/questions/3276467/adjusting-div-width-and-height-after-rotated
    // TODO: rotate vertices array
    var RotateImage = function(angle, img) {
        var sin = Math.sin(angle * Math.PI / 180);
        var cos = Math.cos(angle * Math.PI / 180);
        var width = img.getWidth();
        var height = img.getHeight();

        // (w,0) rotation
        var x1 = cos * width;
        var y1 = sin * width;
        
        // (0,h) rotation
        var x2 = -sin * height;
        var y2 = cos * height;
        
        // (w,h) rotation
        var x3 = cos * width - sin * height;
        var y3 = sin * width + cos * height;
        
        var minX = Math.min(0, x1, x2, x3);
        var maxX = Math.max(0, x1, x2, x3);
        var minY = Math.min(0, y1, y2, y3);
        var maxY = Math.max(0, y1, y2, y3);
        
        var rotatedWidth  = maxX - minX;
        var rotatedHeight = maxY - minY;
        
        // resize the image
        BaseImage.call(this, 
                       Math.floor(rotatedWidth / 2),
                       Math.floor(rotatedHeight / 2));
        this.img	= img;
        this.width	= Math.floor(rotatedWidth);
        this.height = Math.floor(rotatedHeight);
        this.angle	= angle;
        this.translateX = Math.floor(-minX);
        this.translateY = Math.floor(-minY);
    };

    RotateImage.prototype = heir(BaseImage.prototype);


    // translate the canvas using the calculated values, then draw at the rotated (x,y) offset.
    RotateImage.prototype.render = function(ctx, x, y) {
        ctx.save();
        ctx.translate(x + this.translateX, y + this.translateY);
        ctx.rotate(this.angle * Math.PI / 180);
        this.img.render(ctx, 0, 0);
        ctx.restore();
    };

    RotateImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof RotateImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.pinholeX === other.pinholeX &&
               this.pinholeY  === other.pinholeY &&
               this.width     === other.width &&
               this.height    === other.height &&
               this.angle     === other.angle &&
               this.translateX=== other.translateX &&
               this.translateY=== other.translateY &&
               types.isEqual(this.img, other.img, aUnionFind) );
    };

    //////////////////////////////////////////////////////////////////////
    // ScaleImage: factor factor image -> image
    // Scale an image
    // TODO: scale vertices array
    var ScaleImage = function(xFactor, yFactor, img) {
        
        // resize the image
        BaseImage.call(this, 
                       Math.floor((img.getWidth() * xFactor) / 2),
                       Math.floor((img.getHeight() * yFactor) / 2));
        
        this.img        = img;
        this.width      = Math.floor(img.getWidth() * xFactor);
        this.height = Math.floor(img.getHeight() * yFactor);
        this.xFactor = xFactor;
        this.yFactor = yFactor;
    };

    ScaleImage.prototype = heir(BaseImage.prototype);


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
        return (this.pinholeX === other.pinholeX &&
               this.pinholeY  === other.pinholeY &&
               this.width     === other.width &&
               this.height    === other.height &&
               this.xFactor   === other.xFactor &&
               this.yFactor   === other.yFactor &&
               types.isEqual(this.img, other.img, aUnionFind) );
    };

    //////////////////////////////////////////////////////////////////////
    // CropImage: startX startY width height image -> image
    // Crop an image
    // TODO: crop vertices array
    var CropImage = function(x, y, width, height, img) {
        
        BaseImage.call(this, 
                       Math.floor(width / 2),
                       Math.floor(height / 2));
        
        this.x          = x;
        this.y          = y;
        this.width      = width;
        this.height     = height;
        this.img        = img;
    };

    CropImage.prototype = heir(BaseImage.prototype);


    CropImage.prototype.render = function(ctx, x, y) {
        ctx.save();
        ctx.translate(-this.x, -this.y);
        this.img.render(ctx, x, y);
        ctx.restore();
    };

    CropImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof CropImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.pinholeX === other.pinholeX &&
               this.pinholeY  === other.pinholeY &&
               this.width     === other.width &&
               this.height    === other.height &&
               this.x         === other.x &&
               this.y         === other.y &&
               types.isEqual(this.img, other.img, aUnionFind) );
    };

    //////////////////////////////////////////////////////////////////////
    // FrameImage: factor factor image -> image
    // Stick a frame around the image
    var FrameImage = function(img) {
        
        BaseImage.call(this, 
                       Math.floor(img.getWidth()/ 2),
                       Math.floor(img.getHeight()/ 2));
        
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
        return (this.pinholeX === other.pinholeX &&
               this.pinholeY === other.pinholeY &&
               types.isEqual(this.img, other.img, aUnionFind) );
    };

    //////////////////////////////////////////////////////////////////////
    // FlipImage: image string -> image
    // Flip an image either horizontally or vertically
    var FlipImage = function(img, direction) {
        this.img        = img;
        this.width      = img.getWidth();
        this.height = img.getHeight();
        this.direction = direction;
        BaseImage.call(this, 
                       img.pinholeX,
                       img.pinholeY);
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
        return (this.pinholeX === other.pinholeX &&
               this.pinholeY  === other.pinholeY &&
               this.width     === other.width &&
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
        var vertices = [{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}];
        BaseImage.call(this, width/2, height/2, vertices);
        this.width = width;
        this.height = height;
        this.style = style;
        this.color = color;
    };
    RectangleImage.prototype = heir(BaseImage.prototype);

    RectangleImage.prototype.getWidth = function() {
        return this.width;
    };


    RectangleImage.prototype.getHeight = function() {
        return this.height;
    };

    RectangleImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof RectangleImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.pinholeX === other.pinholeX &&
                this.pinholeY === other.pinholeY &&
                this.width    === other.width &&
                this.height   === other.height &&
                this.style    === other.style &&
                types.isEqual(this.color, other.color, aUnionFind));
    };


    //////////////////////////////////////////////////////////////////////
    // RhombusImage: Number Number Mode Color -> Image
    var RhombusImage = function(side, angle, style, color) {
        // sin(angle/2-in-radians) * side = half of base
        this.width = Math.sin(angle/2 * Math.PI / 180) * side * 2;
        // cos(angle/2-in-radians) * side = half of height
        this.height = Math.abs(Math.cos(angle/2 * Math.PI / 180)) * side * 2;
        this.vertices = [{x:this.width/2, y:0},
                         {x:this.width,   y:this.height/2},
                         {x:this.width/2, y:this.height},
                         {x:0,            y:this.height/2}];
        BaseImage.call(this, this.width/2, this.height/2, this.vertices);
        this.side = side;
        this.angle = angle;
        this.style = style;
        this.color = color;
    };
    RhombusImage.prototype = heir(BaseImage.prototype);

    RhombusImage.prototype.getWidth = function() {
        return this.width;
    };


    RhombusImage.prototype.getHeight = function() {
        return this.height;
    };

    RhombusImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof RhombusImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.pinholeX === other.pinholeX &&
                this.pinholeY === other.pinholeY &&
                this.side     === other.side &&
                this.angle    === other.angle &&
                this.style    === other.style &&
                types.isEqual(this.color, other.color, aUnionFind));
    };


    //////////////////////////////////////////////////////////////////////
    // TODO: DO WE NEED THIS?
    var ImageDataImage = function(imageData) {
      var vertices = [{x:0,y:0},
                      {x:imageData.width,y:0},
                      {x:imageData.width,y:imageData.height},
                      {x:0,y:imageData.height}];
        BaseImage.call(this, 0, 0, vertices);
        this.imageData = imageData;
        this.width = imageData.width;
        this.height = imageData.height;
    };

    ImageDataImage.prototype = heir(BaseImage.prototype);

    ImageDataImage.prototype.render = function(ctx, x, y) {
        ctx.putImageData(this.imageData, x, y);
    };

    ImageDataImage.prototype.getWidth = function() {
        return this.width;
    };


    ImageDataImage.prototype.getHeight = function() {
        return this.height;
    };

    ImageDataImage.prototype.isEqual = function(other, aUnionFind) {
        return (other instanceof ImageDataImage &&
                this.pinholeX === other.pinholeX &&
                this.pinholeY === other.pinholeY);
        // FIXME
    };




    //////////////////////////////////////////////////////////////////////
    // PolygonImage: Number Count Step Mode Color -> Image
    //
    // See http://www.algebra.com/algebra/homework/Polygons/Inscribed-and-circumscribed-polygons.lesson
    // the polygon is inscribed in a circle, whose radius is length/2sin(pi/count)
    // another circle is inscribed in the polygon, whose radius is length/2tan(pi/count)
    // rotate a 3/4 quarter turn plus half the angle length to keep bottom base level
    var PolygonImage = function(length, count, step, style, color) {
        var vertices = [];
        var xMax = 0;
        var yMax = 0;
        var xMin = 0;
        var yMin = 0;
        
        this.outerRadius = Math.floor(length/(2*Math.sin(Math.PI/count)));
        this.innerRadius = Math.floor(length/(2*Math.tan(Math.PI/count)));
        var adjust = (3*Math.PI/2)+Math.PI/count;
        
        // rotate around outer circle, storing x,y pairs as vertices
        // keep track of mins and maxs
        var radians = 0;
        for(var i = 0; i < count; i++) {
            // rotate to the next vertex (skipping by this.step)
            radians = radians + (step*2*Math.PI/count);
            
            var v = {   x: this.outerRadius*Math.cos(radians-adjust),
                        y: this.outerRadius*Math.sin(radians-adjust) };
            if(v.x < xMin){ xMin = v.x; }
            if(v.x > xMax){ xMax = v.y; }
            if(v.y < yMin){ yMin = v.x; }
            if(v.y > yMax){ yMax = v.y; }
            vertices.push(v);
        }
        // HACK: try to work around handling of non-integer coordinates in CANVAS
        // by ensuring that the boundaries of the canvas are outside of the vertices
        for(i=0; i<vertices.length; i++){
            if(vertices[i].x < xMin){ xMin = vertices[i].x-1; }
            if(vertices[i].x > xMax){ xMax = vertices[i].x+1; }
            if(vertices[i].y < yMin){ yMin = vertices[i].y-1; }
            if(vertices[i].y > yMax){ yMax = vertices[i].y+1; }
        }
        this.width      = Math.floor(xMax-xMin);
        this.height     = Math.floor(yMax-yMin);
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
        BaseImage.call(this, Math.floor(this.width/2), Math.floor(this.height/2), vertices);
    };
    PolygonImage.prototype = heir(BaseImage.prototype);

    PolygonImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof PolygonImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.pinholeX === other.pinholeX &&
                this.pinholeY === other.pinholeY &&
                this.length   === other.length &&
                this.step     === other.step &&
                this.count    === other.count &&
                this.style    === other.style &&
                types.isEqual(this.color, other.color, aUnionFind));
    };


    var maybeQuote = function(s) {
        if (/ /.test(s)) {
            return "\"" + s + "\"";
        }
        return s;
    };

    //////////////////////////////////////////////////////////////////////
    // TextImage: String Number Color String String String String any/c -> Image
    //////////////////////////////////////////////////////////////////////
    // TextImage: String Number Color String String String String any/c -> Image
    var TextImage = function(msg, size, color, face, family, style, weight, underline) {        
        var metrics;
        this.msg        = msg;
        this.size       = size;
        this.color      = color;
        this.face       = face;
        this.family     = family;
        this.style      = (style === "slant")? "oblique" : style;  // Racket's "slant" -> CSS's "oblique"
        this.weight     = (weight=== "light")? "lighter" : weight; // Racket's "light" -> CSS's "lighter"
        this.underline  = underline;
        // example: "bold italic 20px 'Times', sans-serif". 
        // Default weight is "normal", face is "Optimer"
        var canvas      = world.Kernel.makeCanvas(0, 0);
        var ctx         = canvas.getContext("2d");
        
        this.font = (this.weight + " " +
                     this.style + " " +
                     this.size + "px " +
                     maybeQuote(this.face) + " " +
                     maybeQuote(this.family));
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
        var vertices = [{x:0,y:0},{x:this.width,y:0},{x:this.width,y:this.height},{x:0,y:this.height}];
        // weird pinhole settings needed for "baseline" alignment
        BaseImage.call(this, Math.round(this.width/2), 0, vertices);
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
        ctx.font                = this.font;
        try { 
            ctx.fillText(this.msg, x, y); 
        } catch (e) {
            this.fallbackOnFont();
            ctx.font            = this.font;    
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
        return (this.pinholeX === other.pinholeX &&
                this.pinholeY === other.pinholeY &&
                this.msg      === other.msg &&
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
        this.points     = points;
        this.outer      = outer;
        this.inner      = inner;
        this.style      = style;
        this.color      = color;
        this.radius     = Math.max(this.inner, this.outer);
        this.width      = this.radius*2;
        this.height     = this.radius*2;
        this.vertices   = [];
        for(var pt = 0; pt < (this.points * 2) + 1; pt++ ) {
          var rads = ( ( 360 / (2 * this.points) ) * pt ) * oneDegreeAsRadian - 0.5;
          var radius = ( pt % 2 === 1 ) ? this.outer : this.inner;
          this.vertices.push({x:this.radius + ( Math.sin( rads ) * radius ),
                              y:this.radius + ( Math.cos( rads ) * radius )} );
        }
        BaseImage.call(this,
                       Math.max(outer, inner),
                       Math.max(outer, inner),
                       this.vertices);
    };

    StarImage.prototype = heir(BaseImage.prototype);

    var oneDegreeAsRadian = Math.PI / 180;

    StarImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof StarImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.pinholeX === other.pinholeX &&
                this.pinholeY === other.pinholeY &&
                this.points   === other.points &&
                this.outer    === other.outer &&
                this.inner    === other.inner &&
                this.style    === other.style &&
                types.isEqual(this.color, other.color, aUnionFind));
    };



    /////////////////////////////////////////////////////////////////////
    //TriangleImage: Number Number Mode Color -> Image
    var TriangleImage = function(side, angle, style, color) {
        // sin(angle/2-in-radians) * side = half of base
        this.width = Math.sin(angle/2 * Math.PI / 180) * side * 2;
        // cos(angle/2-in-radians) * side = height of altitude
        this.height = Math.floor(Math.abs(Math.cos(angle/2 * Math.PI / 180)) * side);
        this.vertices = [];
        // if angle < 180 start at the top of the canvas, otherwise start at the bottom
        if(angle < 180){
          this.vertices.push({x:this.width/2, y:0});
          this.vertices.push({x:0,            y:this.height});
          this.vertices.push({x:this.width,   y:this.height});
        } else {
          this.vertices.push({x:this.width/2, y:this.height});
          this.vertices.push({x:0,            y:0});
          this.vertices.push({x:this.width,   y:0});
        }
        BaseImage.call(this, Math.floor(this.width/2), Math.floor(this.height/2), this.vertices);
        this.side = side;
        this.angle = angle;
        this.style = style;
        this.color = color;
    };
    TriangleImage.prototype = heir(BaseImage.prototype);

    TriangleImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof TriangleImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.pinholeX === other.pinholeX &&
                this.pinholeY === other.pinholeY &&
                this.side     === other.side &&
                this.angle    === other.angle &&
                this.style    === other.style &&
                types.isEqual(this.color, other.color, aUnionFind));
    };

    /////////////////////////////////////////////////////////////////////
    //RightTriangleImage: Number Number Mode Color -> Image
    var RightTriangleImage = function(side1, side2, style, color) {
        this.width = side1;
        this.height = side2;
        this.vertices = [{x:0,     y:side2},
                         {x:side1, y:side2},
                         {x:0,     y:0}];
 
        BaseImage.call(this, Math.floor(this.width/2), Math.floor(this.height/2), this.vertices);
        this.side1 = side1;
        this.side2 = side2;
        this.style = style;
        this.color = color;
    };
    RightTriangleImage.prototype = heir(BaseImage.prototype);

    RightTriangleImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof RightTriangleImage)) {
            return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.pinholeX === other.pinholeX &&
                this.pinholeY === other.pinholeY &&
                this.side1    === other.side1 &&
                this.side2    === other.side2 &&
                this.style    === other.style &&
                types.isEqual(this.color, other.color, aUnionFind));
    };

    //////////////////////////////////////////////////////////////////////
    //Ellipse : Number Number Mode Color -> Image
    var EllipseImage = function(width, height, style, color) {
        BaseImage.call(this, Math.floor(width/2), Math.floor(height/2));
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
         return (this.pinholeX === other.pinholeX &&
                this.pinholeY === other.pinholeY &&
                this.width    === other.width &&
                this.height   === other.height &&
                this.style    === other.style &&
                types.isEqual(this.color, other.color, aUnionFind));
    };


    //////////////////////////////////////////////////////////////////////
    //Line: Number Number Color Boolean -> Image
    var LineImage = function(x, y, color, normalPinhole) {
        if (x >= 0) {
          if (y >= 0) {
            BaseImage.call(this, 0, 0,    [{x:  0, y:  0}, {x: x, y: y}]);
          } else {
            BaseImage.call(this, 0, -y,   [{x:  0, y: -y}, {x: x, y: 0}]);
          }
        } else {
          if (y >= 0) {
            BaseImage.call(this, -x, 0,   [{x: -x, y:  0}, {x: 0, y: y}]);
          } else {
            BaseImage.call(this, -x, -y,  [{x: -x, y: -y}, {x: 0, y: 0}]);
          }
        }
        this.color = color;
        this.width = Math.abs(x) + 1;
        this.height = Math.abs(y) + 1;
        this.style = "outline";
 
        // put the pinhle in the center of the image
        if(normalPinhole){
            this.pinholeX = this.width/2;
            this.pinholeY = this.height/2;
        }
    };

    LineImage.prototype = heir(BaseImage.prototype);

    LineImage.prototype.isEqual = function(other, aUnionFind) {
        if (!(other instanceof LineImage)) {
          return BaseImage.prototype.isEqual.call(this, other, aUnionFind);
        }
        return (this.pinholeX === other.pinholeX &&
                this.pinholeY === other.pinholeY &&
                this.x        === other.x &&
                this.y        === other.y &&
                types.isEqual(this.color, other.color, aUnionFind));
    };





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
    world.Kernel.rightTriangleImage = function(side1, side2, style, color) {
        return new RightTriangleImage(side1, side2, style, color);
    };
    world.Kernel.triangleImage = function(side, angle, style, color) {
        return new TriangleImage(side, angle, style, color);
    };
    world.Kernel.ellipseImage = function(width, height, style, color) {
        return new EllipseImage(width, height, style, color);
    };
    world.Kernel.lineImage = function(x, y, color, normalPinhole) {
        return new LineImage(x, y, color, normalPinhole);
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
    world.Kernel.imageDataImage = function(imageData) {
        return new ImageDataImage(imageData);
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
    world.Kernel.isRightTriangleImage = function(x) { return x instanceof RightTriangleImage; };
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
