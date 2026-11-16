/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import auth from '@react-native-firebase/auth';
import App from '../App';

async function renderApp() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  return renderer;
}

describe('App', () => {
  it('shows the login screen when nobody is signed in', async () => {
    const renderer = await renderApp();
    const tree = JSON.stringify(renderer.toJSON());
    expect(tree).toContain('Dev Login');
    expect(tree).toContain('Not logged in');
    expect(tree).not.toContain('Journal Calendar'); // the signed-in Home screen
  });

  it('points Auth at the local emulator in development builds', async () => {
    await renderApp();
    expect(auth().useEmulator).toHaveBeenCalledWith('http://localhost:9099');
  });
});
