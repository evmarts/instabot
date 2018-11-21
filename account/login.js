export async function login(username, password){
    var device = new Client.Device(username);
    const session = await getSesh(username, password, device);
    return {session, device}
}

const getSesh = async (username, password, device) => {
    return await new Promise((resolve, reject) => {
      resolve(Client.Session.create(device, storage, username, password));
    });
  };