# Contributing to mailhog-awesome

The mailhog-awesome repository is managed using an [Nx](https://nx.dev/getting-started/what-is-nx) workspace.

Run all tests for the mailhog-awesome library:
`$ npm run test`


## Development Setup

The recommended IDE for developing is [Visual Studio Code (VSCode)](https://code.visualstudio.com/). The following extensions can be helpful:

- [Docker](https://marketplace.visualstudio.com/items?itemName=PeterJausovec.vscode-docker)
- [TSLint](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-tslint-plugin)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

A development environment can be created using [docker](https://www.docker.com/get-started) and [docker-compose](https://docs.docker.com/compose/install/):

```
$ ./start-development.sh
```

The following container will be started:

```sh
mailhog-awesome.dev # Development container with NodeJS installed
mailhog # Mailhog container 
```

All dependencies have to be initially installed using npm:

```
$ npm install
```

## Publishing to npm

A new version of the `mailhog-awesome` package can be published to npm like this:

```
$ npm run pack:lib
$ cd dist/libs/mailhog-awesome/src
$ npm publish
```
