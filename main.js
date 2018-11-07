const { USER_CREDS } = require("./hidden/hidden.js");
var Client = require("instagram-private-api").V1;
var storage = new Client.CookieFileStorage(__dirname + "/cookies/cookies.json");
const Promise = require("bluebird");
const knex = require("./database");
const fs = require("fs");

main = async () => {
  var device = new Client.Device(USER_CREDS.acc3.username);
  const session = await getSesh(USER_CREDS.acc3, device);

  const recentMedia = await getRecentMedia(session, USER_CREDS.acc1.accountID);
  const recentMediaIds = getMediaIDs(recentMedia).slice(0,1);

  console.log(recentMediaIds);

  recentMediaIds.forEach(async mId => {
    let mentioned = await getUsersMentioned(session, mId)
    
  })
};

// gets a user object by a user id
const getUserById = (session, userId) => {
  return Client.Account.getById(session, userId);
};

// writes an array to a text file
const writeArrayToDisc = (array, path) => {
  fs.appendFile(path, array.toString())
};

// reads a text file to a string
const readFileToString = path => {
  return fs.readFileSync(path, "utf-8");
};

// gets the users mentioned in the comments of a media
const getUsersMentioned = async (session, mediaID) => {
  let feed = new Client.Feed.MediaComments(session, mediaID);
  let isFirstIteration = true;
  isFirstIteration = false;
  let comments = [];
  comments.push(
    await new Promise((resolve, reject) => {
      resolve(feed.all());
    })
  );
  let nextCursor = feed.getCursor();
  feed.setCursor(nextCursor);

  feed.get().then(comments => {
    console.log(comments);
  });

  // feed.all().then(result => {
  //   let nextCursor = feed.getCursor();
  //   console.log(nextCursor)
  //   feed.setCursor(nextCursor);
  //   console.log(result.length);
  //   console.log(feed.getCursor())
  // });
};

// gives likes to the last K medias of a user
const likerUserLastKMedia = async (session, userID, k) => {
  let recentMediaIDs = (await getRecentMedia(session, userID))
    .slice(0, k)
    .map(m => {
      return m._params.id;
    });
  for (recentMediaID of recentMediaIDs) {
    Client.Like.create(session, recentMediaID);
  }
};

// gets the likers of a list of mediaIds
const getLikersOfMedias = async (session, recentMediaIDs) => {
  let recentMediaLikers = [];
  for (mid of recentMediaIDs) {
    let likers = await getLikersOfMedia(session, mid);
    recentMediaLikers.push(likers);
  }
  return recentMediaLikers;
};

// gets the likers of a media
const getLikersOfMedia = async (session, mediaID) => {
  return await new Promise((resolve, reject) => {
    resolve(Client.Media.likers(session, mediaID));
  });
};

// get the ids of a list of media
const getMediaIDs = recentMedia => {
  let ids = [];
  recentMedia.forEach(m => {
    ids.push(m._params.id);
  });
  return ids;
};

// gets followers of an account given a AccountFollowers feed
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

// get all followers of a user
const getFollowersOfUser = async (session, accountID) => {
  let feed = new Client.Feed.AccountFollowers(session, accountID);
  let parsedUsersObj;
  let isFirstIteration = !feed.isMoreAvailable();
  while (feed.isMoreAvailable() == true || isFirstIteration) {
    isFirstIteration = false;
    parsedUsersObj = [];
    (await getFollowersBatch(feed)).forEach(f => {
      parsedUsersObj.push(parseUserObj(f));
    });
    return parsedUsersObj;
  }
};

// get all followings of a user
const getFollowingsOfUser = async (session, userId) => {
  let feed = new Client.Feed.AccountFollowing(session, userId);
  let parsedUsersObj;
  let isFirstIteration = !feed.isMoreAvailable();
  while (feed.isMoreAvailable() == true || isFirstIteration) {
    isFirstIteration = false;
    parsedUsersObj = [];
    (await getFollowersBatch(feed)).forEach(f => {
      parsedUsersObj.push(parseUserObj(f));
    });
  }
  return parsedUsersObj;
};

// parses the user response from API into an object that can be inserted into db
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

// inserts a list of user objects into the db
const insertUsers = async parsedUsersObj => {
  await knex("users_dankit").insert(parsedUsersObj);
};

const getSesh = async (acc, device) => {
  return await new Promise((resolve, reject) => {
    resolve(Client.Session.create(device, storage, acc.username, acc.password));
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

const findMutuals = array => {
  dict = {};
  for (e of array) {
    dict[e] = (dict[e] || 0) + 1;
  }
  return dict;
};

main();
