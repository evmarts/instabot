const {
  USER_CREDS
} = require("./hidden/hidden.js");
var Client = require("instagram-private-api").V1;
var storage = new Client.CookieFileStorage(__dirname + "/cookies/cookies.json");
const Promise = require("bluebird");
const knex = require("./database");
const fs = require("fs");
const _ = require("lodash");
import {login} from './account'


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
///////////////////////////    M  A  I  N   ////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////


/// TODO this project should focus on finding a list of users to follow, not actually sending
// the api requests to follow them
main = async () => {
  // login("acc", "pw")
  // var device = new Client.Device(USER_CREDS.acc1.username);
  // const session = await getSesh(USER_CREDS.acc1, device);

  // // const competitors = ["oldrowofficial", "totalfratmove"];
  // const competitors = [
  //   "420.nation",
  //   "cannabisbae",
  //   "weed.humor.daily",
  //   "stonertopia",
  // ]
  // // insertCommentersOfCompetitorMedia(device, session);
  // // insertLikersOfCompetitorsMedia(device, session);
  // // insertMentionedUsers(device, session);

  // // let competitorsIds = [];
  // let competitorsIds = [ 1395733100, 2243201223, 3229518635, 1497062198 ]
  // // for (c of competitors) {
  // //   competitorsIds.push(await getUserIdFromUsername(session, c));
  // // }
  // // competitorsIds = competitorsIds.map(c => parseUserObj(c))
  // // insertUsers(competitorsIds, "dnk_competitors")

  // let likers = [];
  // for (cid of competitorsIds) {
  //   let recentMediaIds = (await getRecentMedia(session, cid))
  //     .map(m => m.id)
  //     .slice(0, 1);
  //   for (mid of recentMediaIds.slice(0,1)) {
  //     likers = likers.concat(await getLikersOfMedia(session, mid));
  //   }
  // }

  // let mentionedUsers = await getUsersFromDB("dnk_users_to_follow_via_comment_mention")
  // console.log(mentionedUsers)
  // const mentionedIds = mentionedUsers.map(mu => mu.user_id);
  // followUsers(0,session, mentionedIds);
  // console.log('mids', mentionedIds)
  // // const likerIds = likers.map(l => l.id);
  // // followUsers(0,session, likerIds);
};


function followUsers(counter, session, userIds){
  let timeout = Math.floor((Math.random() * 10) + 1)*1000;
  console.log(timeout);
  if(counter < 10){
    setTimeout(function(){
      counter++;
      console.log("followed user", userIds[counter]);
      followUsers(counter, session, userIds);
    }, timeout);
  }
}

const getUsersFromDB = async (tableName) => {
  return await knex.table(tableName).select();
}

const followUser = async (session, userId) => {
  return Client.Relationship.create(session, userId);
};

const getMediaCommenters = async (session, mediaId) => {
  let feed = new Client.Feed.MediaComments(session, mediaId);
  let comments = await new Promise((resolve, reject) => {
    resolve(feed.all());
  });
  let users = [];
  for (c of comments) {
    users = users.concat(c);
  }
  return users;
};

const insertMentionedUsers = async (device, session) => {
  const recentMedia = await getRecentMedia(session, USER_CREDS.acc1.accountID);
  const recentMediaIds = getMediaIDs(recentMedia);

  let mentioned = [];
  for (recentMediaId of recentMediaIds) {
    mentioned = mentioned.concat(
      await getUsersMentioned(session, recentMediaId)
    );
  }
  mentioned = _.uniq(mentioned);
  let users = [];
  for (userName of mentioned) {
    let userObject = await search_user(session, userName);
    if (typeof userObject !== "undefined") {
      users.push(parseUserObj(userObject));
    }
  }
  insertUsers(users, "dnk_users_to_follow_via_comment_mention");
};

const insertCommentersOfCompetitorMedia = async (device, session) => {
  const competitors = ["oldrowofficial"];
  const competitorsIds = [];
  for (c of competitors) {
    competitorsIds.push(await getUserIdFromUsername(session, c));
  }

  let commenters = [];
  for (cid of competitorsIds) {
    let recentMediaIds = (await getRecentMedia(session, cid)).map(m => m.id);
    for (mid of recentMediaIds.slice(0, 2)) {
      let commentersOfMedia = await getMediaCommenters(session, mid);
      commenters = commenters.concat(
        commentersOfMedia.map(m => m._params.userId)
      );
      console.log("got", commentersOfMedia.length, "commenters from", mid);
    }
  }

  const parsedUsersObj = commenters.map(c => parseUserObj(c));
  insertUsers(
    parsedUsersObj,
    "dnk_users_to_follow_from_competitors_commentors"
  );
};

const insertLikersOfCompetitorsMedia = async (device, session) => {
  const competitors = ["oldrowofficial", "totalfratmove"];
  const competitorsIds = [];
  for (c of competitors) {
    competitorsIds.push(await getUserIdFromUsername(session, c));
  }

  let likers = [];
  for (cid of competitorsIds) {
    let recentMediaIds = (await getRecentMedia(session, cid))
      .map(m => m.id)
      .slice(0, 1);
    for (mid of recentMediaIds) {
      likers = likers.concat(await getLikersOfMedia(session, mid));
    }
  }

  const parsedUsersObj = likers.map(l => parseUserObj(l));
  insertUsers(parsedUsersObj, "dnk_users_to_follow_from_competitors_likers");
};

// gets a user object by a user id
async function getUserById(session, username) {
  return Client.Account.getById(session, username)
    .then(account => {
      return account;
    })
    .catch(err => console.error(err.message));
}

async function search_user(session, username) {
  return Client.Account.searchForUser(session, username)
    .then(account => {
      return account;
    })
    .catch(err => console.error(err.message));
}

async function getUserIdFromUsername(session, username) {
  return Client.Account.searchForUser(session, username)
    .then(account => {
      return account.id;
    })
    .catch(err => console.error(err.message));
}

// writes an array to a text file
const writeArrayToDisc = (array, path) => {
  fs.appendFile(path, array.toString());
};

// reads a text file to a string
const readFileToString = path => {
  return fs.readFileSync(path, "utf-8");
};

const extractUserNames = string => {
  const matches = [];
  for (s of string.split()) {
    const re = /(?:@)([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/;
    if (s.match(re)) {
      matches.push(s.match(re)[1]);
    }
  }
  return matches;
};


// const followUsers = async (session, userIds) => {
  
//   for (u of userIds) {
//     // await followUser(session, u);
//     console.log("followed", u);

//     await setTimeout(()=>{
//       "timeout"
//     },1000)
//   }
// };

// TODO
// gets the users mentioned in the comments of a media
const getUsersMentioned = async (session, mediaID) => {
  let feed = new Client.Feed.MediaComments(session, mediaID);
  let comments = await new Promise((resolve, reject) => {
    resolve(feed.get());
  });
  let mentioned = [];
  for (c of comments) {
    mentioned = mentioned.concat(extractUserNames(c._params.text));
  }
  return mentioned;
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
  if (userObj) {
    if (!userObj.username) {
      return {
        user_id: userObj
      };
    } else {
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
        profile_pic_id: userObj._params.profilePicId ?
          userObj._params.profilePicId : null,
        img_url: userObj._params.picture
      };
    }
  }
};

// inserts a list of user objects into the db
const insertUsers = async (parsedUsersObj, tableName) => {
  const BATCHSIZE = 200;
  for (let i = 0; i < parsedUsersObj.length; i = i + BATCHSIZE) {
    await knex(tableName).insert(parsedUsersObj.slice(i, i + BATCHSIZE));
  }
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