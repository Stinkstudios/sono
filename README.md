# sono

[![NPM version](https://badge.fury.io/js/sono.svg)](http://badge.fury.io/js/sono) [![Build Status](https://travis-ci.org/Stinkstudios/sono.svg?branch=master)](https://travis-ci.org/Stinkstudios/sono)

A simple yet powerful JavaScript library for working with Web Audio

<http://stinkstudios.github.io/sono/>

## Features

* Full audio management including loading, playback, effects and processing
* Abstracts differences across browsers such as file types and Web Audio support
* Web Audio effects such as 3d positioning, reverb and frequency analysis
* Handles inputs from audio files, media elements, microphone, oscillators and scripts
* Falls back to HTMLAudioElement where Web Audio is not supported (e.g. IE 11 and less)
* Pauses and resumes audio playback on page visibility changes
* Handles initial touch to unlock media playback on mobile devices

## Installation

```shell
npm i -S sono
```

## Usage

```javascript
import sono from 'sono';
import 'sono/effects';
import 'sono/utils';

const sound = sono.create('boom.mp3');
sound.effects = [sono.echo(), sono.reverb()];
sound.play();
```

## Documentation

### [Getting started](docs/getting-started.md)

### [Sounds](docs/sounds.md)

### [Effects](docs/effects.md)

### [Controls](docs/controls.md)

### [Loading](docs/loading.md)

### [Utils](docs/utils.md)

## Dev setup

### Install dependencies

```shell
npm i
```

### Run tests

```shell
npm i -g karma-cli
npm test
```

### Run examples

```shell
npm run examples
```

### Build bundles

```shell
npm run build
```

### Watch and test

```shell
npm start
```
