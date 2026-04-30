# old version
FROM node:22.4.0

WORKDIR /workspace

COPY . /workspace

RUN npm install && npx nx build talos
# RUN apt-get update && apt-get install -y chromium
RUN apt-get update && apt-get install -y node-rimraf wget gconf-service libasound2 libatk1.0-0 libcairo2 libcups2 libfontconfig1 libgdk-pixbuf2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libxss1 fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils

# install chrome & build
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb

RUN dpkg -i google-chrome-stable_current_amd64.deb; apt-get -fy install

CMD ["npm", "start"]