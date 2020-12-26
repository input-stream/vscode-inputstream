import * as vscode from 'vscode';
import { makeCommandURI } from '../../common';
import { BuiltInCommands } from '../../constants';
import { SearchImagesRequest } from '../../proto/build/stack/inputstream/v1beta1/SearchImagesRequest';
import { SearchImagesResponse } from '../../proto/build/stack/inputstream/v1beta1/SearchImagesResponse';
import { SearchImage } from '../../proto/build/stack/inputstream/v1beta1/SearchImage';

export class ImageSearchRenderer {

	private readonly _disposables: vscode.Disposable[] = [];

	constructor() {
	}

	dispose() {
		let item: vscode.Disposable | undefined;
		while ((item = this._disposables.pop())) {
			item.dispose();
		}
	}

	public async renderSummary(request: SearchImagesRequest, response: SearchImagesResponse): Promise<string> {
		const atLimit = response.totalImages === response.image?.length;
		let html = '';
		if (response.image?.length) {
            const startPage = Math.max(1, request.page || 1);
            const startIndex = 1 * startPage;
            const endIndex = startIndex + response.image.length - 1;
			html += `<span>Showing image ${startIndex}-${endIndex} of ${response.totalImages}</span>`;
		}
		if (html === '') {
			html = 'No results.';
		}
		return html;
	}

	public async renderResults(response: SearchImagesResponse): Promise<string> {

		let lines: string[] = [];
        lines.push('<div class="grid" data-masonry=\'{ "itemSelector": ".grid-item", "columnWidth": 200 }\'>');
		response.image?.forEach(image => {
			this.formatSearchImageResult(lines, image);
		});
        lines.push('</div>');
		return lines.join('\n');
	}

	private formatSearchImageResult(lines: string[], image: SearchImage) {
		// const openCommand = getVscodeOpenCommand(result.path!, lineNo, 0);
        lines.push(`<div class="grid-item" style="padding: 0.5rem" data-id="${image.id}" onclick="postDataElementClick('image', this)">`);
        // lines.push(`<img src="${image.url}" width="${image.width}" height="${image.height}" data-id="${image.id}">`);
        lines.push(`<img src="${image.url}" data-id="${image.id}">`);
        lines.push('</div>');
	}

}

function getVscodeOpenCommand(filename: string, line: number, col: number): string {
	return makeCommandURI(BuiltInCommands.Open, vscode.Uri.file(filename).with({
		fragment: [line, col].join(','),
	}).toString());
}

const htmlEscapes: { [key in string]: string } = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

function escapeHtml(html: string): string {
	return html.replace(/[&<>"']/g, chr => htmlEscapes[chr]);
}