## gulp-es6-webpack-example

docker kill emailgate-pdf
docker rm emailgate-pdf
docker build -t emailgate-pdf .
docker run -t -i --env-file ./.env emailgate-pdf /bin/bash


> phantomjs-prebuilt@2.1.7 install /var/app/node_modules/phantomjs-prebuilt
> node install.js

PhantomJS not found on PATH
Downloading https://github.com/Medium/phantomjs/releases/download/v2.1.1//phantomjs-2.1.1-linux-x86_64.tar.bz2
Saving to /var/app/node_modules/phantomjs-prebuilt/phantomjs/phantomjs-2.1.1-linux-x86_64.tar.bz2
Receiving...



### Docker Notes

- This will give the env variables to connect to the docker-machine
$ docker-machine env default

export DOCKER_TLS_VERIFY="1"
export DOCKER_HOST="tcp://192.168.99.100:2376"
export DOCKER_CERT_PATH="/Users/nmajor/.docker/machine/machines/default"
export DOCKER_MACHINE_NAME="default"
# Run this command to configure your shell:
# eval "$(docker-machine env default)"

curl https://192.168.99.100:2376/images/json \
  --cert ~/.docker/machine/machines/default/cert.pem \
  --key ~/.docker/machine/machines/default/key.pem \
  --cacert ~/.docker/machine/machines/default/ca.pem


docker rm $(docker ps -a -q)
