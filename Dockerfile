FROM node:4.4.3-slim
# https://hub.docker.com/r/library/node/

RUN apt-get update
RUN apt-get install -y bzip2 libfontconfig git

WORKDIR /tmp
RUN wget https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-2.1.1-linux-x86_64.tar.bz2
WORKDIR /tmp/
RUN tar xvjf phantomjs-2.1.1-linux-x86_64.tar.bz2
RUN mv phantomjs-2.1.1-linux-x86_64/bin/phantomjs /bin/

ENV HOME /var/app
RUN mkdir $HOME

WORKDIR $HOME
COPY package.json ./

RUN npm install

COPY . ./

CMD ["node", "main.js"]
