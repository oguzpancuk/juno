/**
 * The privacy text as a signed-in person reaches it, from Settings, inside
 * the tab bar. The same file also serves `/legal` at the root for someone
 * who has not signed in yet (linked from welcome and sign-in), where there
 * is no tab bar to keep. One source, two routes.
 */
export { default } from '../../../legal';
