import { corsHeaders, jsonResponse } from './common.js';
import { fetchGroupDetails, fetchSteamPage, parseFriendsCount, parseGroupsPage, parseSteamProfile, resolveSteamId } from './steam.js';

export async function handleProfile(steamId, request, env, user) {
  try {
    const resolvedId = await resolveSteamId(steamId);
    if (!resolvedId) {
      return new Response(
        JSON.stringify({ error: 'invalid steam id or vanity url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [profileHtml, groupsHtml, friendsHtml, locationHtml] = await Promise.all([
      fetchSteamPage(`https://steamcommunity.com/profiles/${resolvedId}/`),
      fetchSteamPage(`https://steamcommunity.com/profiles/${resolvedId}/groups/`),
      fetchSteamPage(`https://steamcommunity.com/profiles/${resolvedId}/friends/`),
      fetchSteamPage(`https://steamid.io/lookup/${resolvedId}`)
    ]);

    if (!profileHtml) {
      return new Response(
        JSON.stringify({ error: 'failed to fetch profile' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileData = await parseSteamProfile(profileHtml, resolvedId, env);

    if (locationHtml) {
      const steamIdIoLoc = locationHtml.match(/<a[^>]+href="[^"]*openstreetmap[^"]*"[^>]*>([^<]+)</);
      if (steamIdIoLoc && steamIdIoLoc[1].trim()) {
        profileData.profile.location = steamIdIoLoc[1].trim();
      }
    }

    let groups = groupsHtml ? parseGroupsPage(groupsHtml) : [];
    const friendsCount = friendsHtml ? parseFriendsCount(friendsHtml) : null;

    const groupsToFetch = groups.slice(0, 15);
    const detailsResults = await Promise.all(groupsToFetch.map(g => fetchGroupDetails(g.link)));

    groups = groups.map((g, i) => {
      const details = i < detailsResults.length ? detailsResults[i] : null;
      return {
        ...g,
        name: details?.name || g.name || g.link,
        members: g.members ?? details?.members ?? null,
        founded: details?.founded ?? g.founded ?? null
      };
    });

    profileData.groups = Array.isArray(groups) ? groups : [];

    let totalFriends = profileData.profile?.friends_count;
    if (totalFriends == null) totalFriends = friendsCount ?? 'Private';

    let mutualGroups = 0;
    if (user && user.steam_id && user.steam_id !== resolvedId) {
      const currentUserGroupsHtml = await fetchSteamPage(`https://steamcommunity.com/profiles/${user.steam_id}/groups/`);
      if (currentUserGroupsHtml) {
        const currentUserGroups = parseGroupsPage(currentUserGroupsHtml).map(g => g.link);
        const viewedUserGroups = new Set(profileData.groups.map(g => g.link));
        mutualGroups = currentUserGroups.filter(link => viewedUserGroups.has(link)).length;
      }
    }

    profileData.mutual_info = {
      mutual_friends: 'WIP',
      mutual_groups: mutualGroups,
      total_friends: totalFriends,
      total_groups: Array.isArray(profileData.groups) ? profileData.groups.length : 0
    };

    return new Response(
      JSON.stringify(profileData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return jsonResponse({ error: String(error && error.message || error) }, 500);
  }
}
