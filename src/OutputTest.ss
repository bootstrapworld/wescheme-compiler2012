#lang racket

(require "compiler/desugar.ss"
         "collects/moby/runtime/stx.ss"
         "compile-helpers.ss"
         "compiler/pinfo.ss"
         "compiler/mzscheme-vm/mzscheme-vm.ss"
         "compiler/mzscheme-vm/collections-module-resolver.ss"
         "compiler/modules.ss")

(define code "(big-bang 0 (on-mouse add1))")


(define default-base-pinfo (pinfo-update-module-resolver
                            (pinfo-update-allow-redefinition? 
                             (get-base-pinfo 'moby) #f)
                            (extend-module-resolver-with-collections
                             default-module-resolver)))


(define parsed (parse-string-as-program code))
(define desugared-and-pinfo (desugar-program parsed default-base-pinfo))
(define desugared (first desugared-and-pinfo))
(define desugared-pinfo (second  desugared-and-pinfo))

;; print out the parsed program text
(map stx->datum parsed)
;; print out the desugared program text
(map stx->datum desugared)
;; print out the racket bytecode and pinfo
(compile-compilation-top desugared desugared-pinfo #:name 'test)
