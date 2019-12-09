## v1.5.0-alpha.1 
- Allow Levee to pass the return variable of the executed function to the circuit callback on timeout
- Update to hoek@^6: #19
- Update all out of date dependencies via greenkeeper update: #28
- Pass return object of executed function to circuit callback: #25


## v1.4.0
- Added a new option for stats `maxSamples` which restricts sample length.

## v1.3.0
- Add custom error message for timeout and circuit open
  - https://github.com/krakenjs/levee/pull/14

## v1.2.1

- added name and code to timeout error:
  - https://github.com/krakenjs/levee/commit/37cdbc110deb9f5fdfcb015103ee003a41e592b5
