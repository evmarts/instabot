const { USER_CREDS } = require("./hidden/hidden.js");
var Client = require("instagram-private-api").V1;
var device = new Client.Device(USER_CREDS.acc1.username);
var storage = new Client.CookieFileStorage(__dirname + "/cookies/cookies.json");
const Promise = require("bluebird");

main = async () => {
  const session = await getSesh();
  let yourRecentMedia = await getRecentMedia(
    session,
    USER_CREDS.acc1.accoundID
  );

  let likers = [];
  yourRecentMedia = yourRecentMedia.slice(0, 2);
  for (m of yourRecentMedia) {
    likers = likers.concat(
      (await getLikersOfMedia(session, m.id)).map(l => l._params.username)
    );
  }
  likers = new Set(likers);
  console.log(likers.size);
};

const getSesh = async () => {
  return await new Promise((resolve, reject) => {
    resolve(
      Client.Session.create(
        device,
        storage,
        USER_CREDS.acc1.username,
        USER_CREDS.acc1.password
      )
    );
  });
};

const getLikersOfMedia = async (session, mediaID) => {
  return await new Promise((resolve, reject) => {
    resolve(Client.Media.likers(session, mediaID));
  });
};

const getRecentMedia = async (session, userID) => {
  return await new Promise((resolve, reject) => {
    let feed = new Client.Feed.UserMedia(session, userID);
    feed.get().then(data => {
      resolve(data);
    });
  });
};

main();
