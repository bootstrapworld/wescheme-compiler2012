#lang racket/base

;; The default module provider for wescheme-compiler.  Override as necessary.

(provide module-provider)
(require "src/module-provider.rkt")


;; FIXME: Set this to wescheme.org as soon as we update the source code.
(define wescheme-module-provider 
  (make-memoizing-module-provider
   (make-wescheme-module-provider #:servlet-path "http://www.wescheme.org/getModuleProviderRecord")))


;; module-provider: symbol -> (U module-provider-record #f)
(define (module-provider name)
  (or (local-module-provider name)
      (wescheme-module-provider name)))