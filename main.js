const { USER_CREDS } = require("./hidden/hidden.js");
var Client = require("instagram-private-api").V1;
var device = new Client.Device(USER_CREDS.acc1.username);
var storage = new Client.CookieFileStorage(__dirname + "/cookies/cookies.json");
const Promise = require("bluebird");
const knex = require("./database");

main = async () => {
  const qres = await knex.select().from("users");
  const session = await getSesh();
  let yourRecentMedia = await getRecentMedia(
    session,
    USER_CREDS.acc1.accountID
  );

  let feed = new Client.Feed.AccountFollowers(
    session,
    USER_CREDS.acc1.accountID
  );

  let parsedUsersObj;

  console.log(feed.isMoreAvailable())
  const isFirstIteration = !feed.isMoreAvailable();
  while (feed.isMoreAvailable() == true && isFirstIteration) {
    parsedUsersObj = [];
    (await getFollowersBatch(feed)).forEach(f => {
      parsedUsersObj.push(parseUserObj(f));
    });
    console.log('inserting...')
    insertUsers(parsedUsersObj);
  }

  return;

  // let likers = [];
  // yourRecentMedia = yourRecentMedia.slice(0, 2);
  // for (m of yourRecentMedia) {
  //   likers = likers.concat(
  //     (await getLikersOfMedia(session, m.id)).map(l => l._params.username)
  //   );
  // }
  // likers = new Set(likers);

  // return;
};

const getFollowersBatch = async feed => {
  return await new Promise((resolve, reject) => {
    feed.get().then(result => {
      if (feed.isMoreAvailable() == true) {
        let nextCursor = feed.getCursor();
        feed.setCursor(nextCursor);
        resolve(result);
      } else {
        resolve(result);
      }
    });
  });
};

const parseUserObj = userObj => {
  return {
    username: userObj._params.username,
    user_id: userObj._params.pk,
    full_name: userObj._params.fullName,
    is_private: userObj._params.isPrivate,
    is_follower: true,
    date_followed: null,
    date_unfollowed: null,
    followers: null,
    following: null,
    media_count: null,
    likes_given_to_this: 0,
    rating: null,
    created_at: new Date(),
    has_anonymous_profile_picture: userObj._params.hasAnonymousProfilePicture,
    profile_pic_id: userObj._params.profilePicId,
    img_url: userObj._params.picture
  };
};

const insertUsers = async parsedUsersObj => {
  await knex("users").insert(parsedUsersObj);
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
