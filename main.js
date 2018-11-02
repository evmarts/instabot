const { USER_CREDS } = require("./hidden/hidden.js");
var Client = require("instagram-private-api").V1;
var device = new Client.Device(USER_CREDS.acc1.username);
var storage = new Client.CookieFileStorage(__dirname + "/cookies/cookies.json");
const Promise = require("bluebird");
const knex = require("./database");


// strategies
// follower users who liked a competitors page
// 

main = async () => {
  // const qres = await knex.select().from("users_dankit");
  const session = await getSesh();
  insertAllFollowers(session, USER_CREDS.acc1.accountID);
  // let recentMedia = await getRecentMedia(session, USER_CREDS.acc1.accountID);
  // let recentMediaIDs = getRecentMediaIDs(recentMedia)
  // let likersOfRecent = await getLikersOfMedias(session, recentMediaIDs.slice(0,3))
  // console.log(recentMedia[0])

  // const tmp = likerUserLastThreeMedia(session, USER_CREDS.acc2.accountID);

  // likerUserLastKMedia(session, USER_CREDS.acc1.accountID, 3);

  // getUsersMentioned(session, "1878635954195781098_2101832171");
  return;
};



// main2 = async () => {
//   console.log('hey')
//   setTimeout(main2, 1000)
// }

// main3 = async () => {
//   console.log('hey2');
// }

const getUsersMentioned = async (session, mediaID) => {
  let feed = new Client.Feed.MediaComments(session, mediaID);
  let isFirstIteration = true;
  isFirstIteration = false;
  let comments = [];
  comments.push(await new Promise((resolve, reject) => {
    resolve(feed.all());
  }));
  // console.log(comments);
  let nextCursor = feed.getCursor();
  console.log(nextCursor);
  feed.setCursor(nextCursor);

  feed.get().then(comments => {
    console.log(comments)
  })

  console.log(comments.length);
  // feed.all().then(result => {
  //   let nextCursor = feed.getCursor();
  //   console.log(nextCursor)
  //   feed.setCursor(nextCursor);
  //   console.log(result.length);
  //   console.log(feed.getCursor())
  // });
};

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

const getLikersOfMedias = async (session, recentMediaIDs) => {
  let recentMediaLikers = [];
  for (mid of recentMediaIDs) {
    let likers = await getLikersOfMedia(session, mid);
    recentMediaLikers.push(likers);
  }
  console.log(recentMediaLikers.length);
  return recentMediaLikers;
};

const getLikersOfMedia = async (session, mediaID) => {
  return await new Promise((resolve, reject) => {
    resolve(Client.Media.likers(session, mediaID));
  });
};

const getRecentMediaIDs = recentMedia => {
  let ids = [];
  recentMedia.forEach(m => {
    ids.push(m._params.id);
  });
  return ids;
};

const getFollowersBatch = async feed => {
  return await new Promise((resolve, reject) => {
    feed.get().then(result => {
      if (feed.isMoreAvailable() == true) {
        let nextCursor = feed.getCursor();
        feed.setCursor(nextCursor);
        console.log(nextCursor);
        resolve(result);
      } else {
        resolve(result);
      }
    });
  });
};

const insertAllFollowers = async (session, accountID) => {
  let feed = new Client.Feed.AccountFollowers(session, accountID);
  let parsedUsersObj;
  let isFirstIteration = !feed.isMoreAvailable();
  while (feed.isMoreAvailable() == true || isFirstIteration) {
    isFirstIteration = false;
    parsedUsersObj = [];
    (await getFollowersBatch(feed)).forEach(f => {
      parsedUsersObj.push(parseUserObj(f));
    });
    console.log("inserting...");
    // insertUsers(parsedUsersObj);
  }
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
  await knex("users_dankit").insert(parsedUsersObj);
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

const getRecentMedia = async (session, userID) => {
  return await new Promise((resolve, reject) => {
    let feed = new Client.Feed.UserMedia(session, userID);
    feed.get().then(data => {
      resolve(data);
    });
  });
};

main2()

main();

// let yourRecentMedia = await getRecentMedia(
//   session,
//   USER_CREDS.acc1.accountID
// );
// let likers = [];
// yourRecentMedia = yourRecentMedia.slice(0, 2);
// for (m of yourRecentMedia) {
//   likers = likers.concat(
//     (await getLikersOfMedia(session, m.id)).map(l => l._params.username)
//   );
// }
// likers = new Set(likers);

// return;
