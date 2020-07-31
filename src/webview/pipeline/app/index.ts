/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import './style.css';
import 'vscode-codicons/dist/codicon.ttf'
import { PipelineRunEditor } from './editor';
import { Trigger } from './utils/types';

declare const acquireVsCodeApi: () => ({ getState(): Trigger; setState(data: Trigger): void; postMessage: (msg: unknown) => void });
export const vscode = acquireVsCodeApi();

const rootElement = document.getElementById('root');

window.addEventListener('message', event => {
  switch (event.data.type) {
    case 'trigger':
      rootElement.appendChild(new PipelineRunEditor(event.data.data).getElement());
      disableButton(document.getElementsByTagName('input'));
      selectText(document.querySelectorAll('[id^=Resources]'), 'Create Pipeline Resource');
      vscode.setState(event.data.data); // TODO: fix this, store real state
      break;
  }
}, false);

// Check if we have an old state to restore from
const previousState = vscode.getState();
if (previousState) {
  restore(previousState);
}

export function selectText(nodeList: NodeListOf<Element>, text?: string, selected?: boolean, id?: string): void {
  nodeList.forEach(element => {
    const resourceSelectList = element.childNodes;
    const op = document.createElement('option');
    op.value = text;
    op.text = text;
    op.id = id ?? '';
    op.selected = selected ?? false;
    resourceSelectList.forEach(selectElement => {
      selectElement.insertBefore(op, selectElement.firstChild);
    });
  })
}

export function disableButton(nodeList: HTMLCollectionOf<HTMLInputElement>): boolean {
  let startButton = document.querySelector('.startButton');
  if (!startButton) {
    startButton = document.querySelector('.startButton-disable')
  }
  for (let element = 0; element < nodeList.length; element++) {
    if (nodeList[element].type === 'text' && nodeList[element].value === '' && nodeList[element].id.trim() !== 'disabled') {
      startButton.className = 'startButton-disable';    // Disable the button.
      return false;
    } else {
      startButton.className = 'startButton';    // Enable the button.
    }
  }
}

function restore(state: Trigger): void {
  rootElement.appendChild(new PipelineRunEditor(state).getElement());
  disableButton(document.getElementsByTagName('input'));
  selectText(document.querySelectorAll('[id^=Resources]'), 'Create Pipeline Resource');
}