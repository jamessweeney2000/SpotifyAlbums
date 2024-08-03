const clientId = "#";
const clientSecret = "#";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    const accessToken = await getAccessToken(clientId, clientSecret, code);
    localStorage.setItem("accessToken", accessToken); // Save access token to localStorage

    const profile = await fetchProfile(accessToken);
    populateUI(profile);

    // const topArtists = await fetchTopArtists(accessToken);
    // populateTopArtistsUI(topArtists);

    // Initial fetch for a specific artist
    try {
        const artistName = ""; // Example artist name
        const artistID = await fetchArtistID(accessToken, artistName);
        console.log(`Artist ID for ${artistName}: ${artistID}`);
        localStorage.setItem("artistID", artistID);

        // Fetch and display the artist's albums
        const albums = await fetchArtistAlbums(accessToken, artistID);
        populateAlbumsUI(albums);
    } catch (error) {
        console.error('Error fetching artist ID or albums:', error);
    }
}

export async function redirectToAuthCodeFlow(clientId: string) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("scope", "user-read-private user-read-email user-top-read"); // added user-top-read scope
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length: number) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function getAccessToken(clientId: string, clientSecret: string, code: string): Promise<string> {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("code_verifier", verifier!);
    params.append("client_secret", clientSecret); // changed to client_secret

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

async function fetchProfile(token: string): Promise<any> {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

// async function fetchTopArtists(token: string): Promise<any> {
//     const result = await fetch("https://api.spotify.com/v1/me/top/artists", {
//         method: "GET", headers: { Authorization: `Bearer ${token}` }
//     });

//     return await result.json();
// }

// async function fetchArtistID(token: string, artistName: string): Promise<string> {
//     const result = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist`, {
//         method: "GET",
//         headers: { Authorization: `Bearer ${token}` }
//     });

//     const data = await result.json();
//     if (data.artists && data.artists.items && data.artists.items.length > 0) {
//         return data.artists.items[0].id; // Return the first matching artist's ID
//     } else {
//         throw new Error('Artist not found');
//     }
// }
async function fetchArtistID(token: string, artistName: string): Promise<string> {
    const result = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await result.json();
    if (data.artists && data.artists.items && data.artists.items.length > 0) {
        return data.artists.items[0].id; // Return the first matching artist's ID
    } else {
        throw new Error('Artist not found');
    }
}

async function fetchArtistAlbums(token: string, artistId: string): Promise<any> {
    const result = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?limit=50`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}


function populateUI(profile: any) {
    document.getElementById("displayName")!.innerText = profile.display_name;
    // if (profile.images[0]) {
    //     const profileImage = new Image(200, 200);
    //     profileImage.src = profile.images[0].url;
    //     document.getElementById("avatar")!.appendChild(profileImage);
    // }
    // document.getElementById("id")!.innerText = profile.id;
    // document.getElementById("email")!.innerText = profile.email;
    // document.getElementById("uri")!.innerText = profile.uri;
    // document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
    // document.getElementById("url")!.innerText = profile.external_urls.spotify;
    // document.getElementById("url")!.setAttribute("href", profile.external_urls.spotify);
    // document.getElementById("imgUrl")!.innerText = profile.images[0]?.url || "No image available";
}

// function populateAlbumsUI(albums: any) {
//     const albumsElement = document.getElementById("albums")!;
//     albumsElement.innerHTML = ''; // Clear any existing content
//     console.log(albums);

//     albums.items.forEach((album: any) => {
//         const albumElement = document.createElement("div");
//         albumElement.className = "album";

//         const albumName = document.createElement("h3");
//         albumName.innerText = album.name;
//         albumElement.appendChild(albumName);

//         if (album.images[0]) {
//             const albumImage = new Image(100, 100);
//             albumImage.src = album.images[0].url;
//             albumElement.appendChild(albumImage);
//         }

//         albumsElement.appendChild(albumElement);
//     });
// }
function populateAlbumsUI(albums: any) {
    const albumsElement = document.getElementById("albums")!;
    albumsElement.innerHTML = ''; // Clear any existing content

    albums.items.forEach((album: any) => {
        const albumElement = document.createElement("div");
        albumElement.className = "album";

        const albumName = document.createElement("h3");
        albumName.innerText = album.name;
        albumElement.appendChild(albumName);

        if (album.images[0]) {
            const albumImage = new Image(100, 100);
            albumImage.src = album.images[0].url;
            albumElement.appendChild(albumImage);
        }

        // Add click event listener to play album
        albumElement.addEventListener("click", () => {
            playAlbum(album.id);
        });

        albumsElement.appendChild(albumElement);
    });
}
function playAlbum(albumId: string) {
    const spotifyPlayer = document.getElementById("spotifyPlayer") as HTMLIFrameElement;
    spotifyPlayer.src = `https://open.spotify.com/embed/album/${albumId}`;
}

document.getElementById("searchButton")!.addEventListener("click", async () => {
    const artistName = (document.getElementById("artistSearch") as HTMLInputElement).value;
    if (artistName) {
        try {
            const accessToken = localStorage.getItem("accessToken");
            if (!accessToken) {
                throw new Error("Access token not found");
            }

            const artistID = await fetchArtistID(accessToken, artistName);
            console.log(`Artist ID for ${artistName}: ${artistID}`);
            localStorage.setItem("artistID", artistID);

            // Fetch and display the artist's albums
            const albums = await fetchArtistAlbums(accessToken, artistID);
            populateAlbumsUI(albums);
        } catch (error) {
            console.error('Error fetching artist ID or albums:', error);
        }
    }
});


