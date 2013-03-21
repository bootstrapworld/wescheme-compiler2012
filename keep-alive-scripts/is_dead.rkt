#lang racket/base

;; exits with 1 if the system thinks the local web server is down.
(require net/url)
(with-handlers ([exn:fail:network? (lambda (exn) (exit 1))])
  (get-pure-port (string->url "http://localhost:8000/"))
  (exit 0))
