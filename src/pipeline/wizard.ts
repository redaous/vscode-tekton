/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { contextGlobalState } from '../extension';
import * as path from 'path';
import { Disposable } from '../util/disposable';
import { debounce } from 'debounce';
import { TknResourceItem } from '../tekton/webviewstartpipeline';
import { startPipeline } from '../tekton/startpipeline';
import { addTriggerToPipeline } from '../tekton/addtrigger';
import { createPvc } from '../tekton/createpvc';

export interface PipelineWizardInput {
  readonly resourceColumn: vscode.ViewColumn;
  readonly trigger: TknResourceItem;
}

export class PipelineWizard extends Disposable {
  static viewType = 'tekton.pipeline.start.wizard';
  static title: string;

  public static create(input: PipelineWizardInput, previewColumn: vscode.ViewColumn, pipeline: string, name: string): PipelineWizard {
    PipelineWizard.title = `${pipeline}: ${path.basename(name)}`;
    const webview = vscode.window.createWebviewPanel(
      PipelineWizard.viewType,
      `${pipeline}: ${path.basename(name)}`,
      previewColumn,
      {
        enableFindWidget: true,
        ...getWebviewOptions()
      }
    );
    return new PipelineWizard(webview, input);
  }

  private editor: vscode.WebviewPanel;
  private updateFunc = debounce(() => this.doUpdate(), 500);
  private readonly onDisposeEmitter = new vscode.EventEmitter<void>();
  public readonly onDispose = this.onDisposeEmitter.event;
  private readonly onDidChangeViewStateEmitter = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();
  public readonly onDidChangeViewState = this.onDidChangeViewStateEmitter.event;

  constructor(webview: vscode.WebviewPanel, private input: PipelineWizardInput) {
    super();
    this.editor = webview;
    this.register(this.editor.onDidDispose(() => {
      this.dispose();
    }));


    this.register(this.editor.webview.onDidReceiveMessage(async e => {
      switch (e.type) {
        case 'startPipeline':
          // eslint-disable-next-line no-case-declarations
          const inputStartPipeline = e.body;
          this.dispose();
          if (inputStartPipeline.newPvc.length !== 0) {
            await createPvc(inputStartPipeline.newPvc);
          }
          return await startPipeline(inputStartPipeline);
        case 'Add Trigger':
          // eslint-disable-next-line no-case-declarations
          const inputAddTrigger = e.body;
          this.dispose();
          return await addTriggerToPipeline(inputAddTrigger);
      }
    }));

    this.updateFunc();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.onDisposeEmitter.fire();
    this.onDisposeEmitter.dispose();

    this.editor.dispose();
    super.dispose();
  }

  reveal(viewColumn: vscode.ViewColumn): void {
    this.editor.reveal(viewColumn);
  }

  update(): void {
    // TODO: 

  }


  private async doUpdate(): Promise<void> {
    if (this.disposed) {
      return;
    }
    const html = this.getHmlContent();
    this.setContent(html);

    try {
      this.postMessage({ type: 'trigger', data: this.input.trigger });
    } catch (err) {
      console.error(err);
    }
  }

  private postMessage(msg: {}): void {
    if (!this.disposed) {
      this.editor.webview.postMessage(msg);
    }
  }

  private setContent(html: string): void {
    this.editor.title = PipelineWizard.title;
    // this.editor.iconPath = this.iconPath; //TODO: implement
    this.editor.webview.options = getWebviewOptions();
    this.editor.webview.html = html;
  }

  private getHmlContent(): string {
    const nonce = new Date().getTime() + '' + new Date().getMilliseconds();
    const rule = this.editor.webview.cspSource;
    return `
    <!DOCTYPE html>
      <html lang="en" class="pf-m-redhat-font">
        <head>
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' ${rule} http: https: data:; media-src 'self' ${rule} http: https: data:; script-src 'nonce-${nonce}'; style-src 'self' ${rule} 'unsafe-inline' http: https: data:; font-src 'self' ${rule} http: https: data:;">
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style type="text/css" media="screen, print">
            @font-face {
              font-family: "codicon";
              src: url("${this.getFontPath()}") format("truetype");
            }
          </style>
        </head>
      <body>
        <div id="root" style="width: 100%; height: 100%;"></div>
        ${this.getScripts(nonce)}
      </body>
      </html>`;
  }

  private getScripts(nonce: string): string {
    const out: string[] = [];
    out.push(`<script
				src="${escapeAttribute(this.editor.webview.asWebviewUri(vscode.Uri.file(path.join(contextGlobalState.extensionPath, '/out/webview/pipeline-wizard/index.js'))))}"
				nonce="${nonce}"
				charset="UTF-8"></script>`);
    return out.join('\n');
  }

  private getFontPath(): string {
    return this.editor.webview.asWebviewUri(vscode.Uri.file(path.join(contextGlobalState.extensionPath, '/out/webview/assets/codicon.ttf'))).toString();
  }

}

function escapeAttribute(value: string | vscode.Uri): string {
  return value.toString().replace(/"/g, '&quot;');
}


function getWebviewOptions(): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: getLocalResourceRoots()
  };
}

function getLocalResourceRoots(): vscode.Uri[] {
  return [
    vscode.Uri.file(path.join(contextGlobalState.extensionPath, '/out/webview')),
    vscode.Uri.file(path.join(contextGlobalState.extensionPath, '/images'))
  ];
}
