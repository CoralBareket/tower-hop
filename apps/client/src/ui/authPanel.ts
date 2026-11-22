import type Phaser from 'phaser';
import { CredentialsSchema, type PublicUser } from '@summit-hop/shared';
import { api } from '../api/client';
import { session } from '../api/session';

/**
 * Login / sign-up form as a real HTML overlay (markup in index.html), not canvas text:
 * password managers, autofill, mobile keyboards and screen readers all just work.
 */
type Mode = 'login' | 'signup';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let mode: Mode = 'login';
let activeScene: Phaser.Scene | null = null;
let onSuccess: ((user: PublicUser) => void) | null = null;
let wired = false;

function setMode(next: Mode): void {
  mode = next;
  const signup = mode === 'signup';
  $('auth-title').textContent = signup ? 'Create account' : 'Log in';
  $('auth-submit').textContent = signup ? 'Sign up' : 'Log in';
  $('auth-switch').textContent = signup ? 'Have an account? Log in' : 'New here? Create an account';
  $<HTMLInputElement>('auth-password').autocomplete = signup ? 'new-password' : 'current-password';
  $('auth-hint').hidden = !signup;
  showError('');
}

function showError(msg: string): void {
  $('auth-error').textContent = msg; // textContent, never innerHTML → no injection
}

function close(): void {
  $('auth-overlay').hidden = true;
  const kb = activeScene?.input.keyboard;
  if (kb) {
    kb.enabled = true;
    kb.enableGlobalCapture();
    kb.resetKeys();
  }
  activeScene = null;
  onSuccess = null;
}

async function submit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const username = $<HTMLInputElement>('auth-username').value.trim();
  const password = $<HTMLInputElement>('auth-password').value;

  if (mode === 'signup') {
    const parsed = CredentialsSchema.safeParse({ username, password });
    if (!parsed.success) return showError(parsed.error.issues[0].message);
  } else if (!username || !password) {
    return showError('Enter your username and password');
  }

  const button = $<HTMLButtonElement>('auth-submit');
  button.disabled = true;
  showError('');
  try {
    const { user } = await (mode === 'signup' ? api.signup : api.login)({ username, password });
    await session.refresh();
    $<HTMLInputElement>('auth-password').value = '';
    const done = onSuccess;
    close();
    done?.(user);
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Something went wrong');
  } finally {
    button.disabled = false;
  }
}

function wire(): void {
  if (wired) return;
  wired = true;
  $<HTMLFormElement>('auth-form').addEventListener('submit', (e) => void submit(e));
  $('auth-switch').addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));
  $('auth-cancel').addEventListener('click', close);
  $('auth-overlay').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    e.stopPropagation(); // typing in the form never reaches the game
  });
}

export function openAuthPanel(scene: Phaser.Scene, done: (user: PublicUser) => void): void {
  wire();
  activeScene = scene;
  onSuccess = done;
  // Hand the keyboard to the form: stop Phaser from handling/capturing keys (e.g. SPACE).
  const kb = scene.input.keyboard;
  if (kb) {
    kb.enabled = false;
    kb.disableGlobalCapture();
  }
  setMode('login');
  $('auth-overlay').hidden = false;
  $<HTMLInputElement>('auth-username').focus();
}
