// hachiware server module cache
const tool = require("hachiware_tool");
const cluster = require("cluster");

module.exports = function(conf){

    if(conf){
        if(!conf.caches){
            conf.caches = {};
        }
    
        if(!conf.caches.name){
            conf.caches.name = conf.hash;
        }    
    }

    var kerneled = false;
    var __mCache = {};
    var __callbacks = {};

    var vm = this;

    this.onKerneled = function(){
        vm.kernel = 1;
        kerneled = true;
    };
    
    /**
     * fookBegin
     */
    this.fookBegin = function(){

        cluster.on("message", function(c_, data){
        
            if(!data){
                return;
            }
    
            var value = null;
    
            if(data.mode == "set"){
                if(!__mCache[data.cacheName]){
                    __mCache[data.cacheName] = {};
                }

                __mCache[data.cacheName][data.field] = data.value;
            }
            else if(data.mode == "get"){
                if(data.field){
                    if(__mCache[data.cacheName]){
                        if(__mCache[data.cacheName][data.field]){
                            value = __mCache[data.cacheName][data.field];
                        }
                    }
                }
                else{
                    if(__mCache[data.cacheName]){
                        value = __mCache[data.cacheName];
                    }
                }
            }
            else if(data.mode == "exists"){
                value = false;

                if(__mCache[data.cacheName]){
                    if(__mCache[data.cacheName][data.field] !== undefined){
                        value = true;
                    }
                }
            }
            else if(data.mode == "delete"){

                if(__mCache[data.cacheName]){
                    if(__mCache[data.cacheName][data.field]){
                        delete __mCache[data.cacheName][data.field];
                    }
                }
            }
    
            c_.send({
                mode: "receive",
                value: value,
                callbackKey:data.callbackKey,
            });
        });

    };

    process.on("message", function(data){

        if(!data){
            return;
        }

        if(data.mode == "receive"){
            if(__callbacks[data.callbackKey]){
                __callbacks[data.callbackKey](data.value);
                delete __callbacks[data.callbackKey];
            }
        }
    });

    const __setCallback = function(ckey,callback){

        if(callback){
            __callbacks[ckey] = callback;
            return;
        }

        return {
            then: function(callback){
                return __callbacks[ckey] = callback;
            },
        };
    };

    /**
     * set
     * @param {*} field 
     * @param {*} value 
     * @param {function} callback
     */
    this.set = function(field, value, callback){

        var ckey = tool.uniqId();

        process.send({
            mode: "set",
            cacheName: conf.caches.name,
            field: field,
            value: value,
            callbackKey: ckey,
        });
    
        return __setCallback(ckey, callback);
    };

    /**
     * get
     * @param {*} field 
     * @param {function} callback
     * @returns 
     */
    this.get = function(field, callback){

        var ckey = tool.uniqId();

        process.send({
            mode: "get",
            cacheName: conf.caches.name,
            field: field,
            callbackKey:ckey,
        });
    
        return __setCallback(ckey, callback);    
    };

    /**
     * exists
     * @param {*} field 
     * @param {*} callback 
     * @returns 
     */
    this.exists = function(field, callback){

        var ckey = tool.uniqId();

        process.send({
            mode: "exists",
            cacheName: conf.caches.name,
            field: field,
            callbackKey:ckey,
        });

        return __setCallback(ckey, callback);
    };

    /**
     * delete
     * @param {*} field 
     * @returns 
     */
    this.delete = function(field, callback){

        var ckey = tool.uniqId();

        process.send({
            mode: "delete",
            cacheName: conf.caches.name,
            field: field,
            callbackKey:ckey,
        });
            
        return __setCallback(ckey, callback);
    };

    /**
     * frameworkAdapter
     * @returns 
     */
    this.frameworkAdapter = function(){

        var vm = this;

        const cache = function(){

            this.set = function(field, value, callback){
                return vm.set(field, value, callback);
            };

            this.get = function(field, callback){
                return vm.get(field, callback);
            };

            this.delete = function(field, callback){
                return vm.delete(field, callback);
            };

            this.exists = function(field, callback){
                return vm.exists(field, callback);
            };
        };

        return new cache();
    };

};