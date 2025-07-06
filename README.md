# react-ffmpeg-starter

video stream processing frontend web app using vite + typescript v5 + react v19 + tailwindcss v4 + ffmpeg.wasm v0.12

## how to run

### setup

- install latest bun runtime

```sh
$ curl -fsSL https://bun.sh/install | bash
bun was installed successfully to ~/.bun/bin/bun

$ bun -v
1.2.15
```

### configure

- install packages with bun

````sh
$ bun init -y
$ bun i

- create runtime variables

```sh
$ cat .env
REACT_APP_API_ENDPOINT={YOUR_API_ENDPOINT}
````

### launch

- run bun app with development mode

```sh
$ bun dev
```
