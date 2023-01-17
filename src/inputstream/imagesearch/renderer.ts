import { SearchImagesRequest } from '../../proto/build/stack/inputstream/v1beta1/SearchImagesRequest';
import { SearchImagesResponse } from '../../proto/build/stack/inputstream/v1beta1/SearchImagesResponse';
import { SearchImage } from '../../proto/build/stack/inputstream/v1beta1/SearchImage';
import { report } from 'process';
import { UnsplashImage } from '../../proto/build/stack/inputstream/v1beta1/UnsplashImage';

export class ImageSearchRenderer {

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
		const lines: string[] = [];
		lines.push('<div class="grid" data-masonry=\'{ "itemSelector": ".grid-item", "columnWidth": 200 }\'>');
		response.image?.forEach(image => {
			this.formatUnsplashImageResult(lines, image.unsplash);
		});
		lines.push('</div>');
		if (response.nextPage) {
			lines.push(`<div style="padding: 1rem">${this.renderNextPageButton(response.nextPage)}</div>`);
		}
		return lines.join('\n');
	}

	private renderNextPageButton(page: number): string {
		return `
		<button class="button" type="button" name="nextPage" data-page="${page}" onclick="postDataElementClick('nextPage', this)">
			Next Page
		</button>`;
	}

	private formatUnsplashImageResult(lines: string[], image: UnsplashImage | null | undefined) {
		if (!image) {
			return;
		}
		// START
		lines.push(`<div class="grid-item" style="font-size: smaller; padding: 0.2rem" data-id="${image.id}" onclick="postDataElementClick('image', this)">`);

		// IMAGE
		lines.push(`<img src="${image.regularUrl}" data-id="${image.id}">`);

		// URLS
		lines.push('<div style="float: right; padding: 0.5 0.5rem 0.2">');
		lines.push(`<a href="${image.rawUrl}" title="Copy Raw URL">Raw</a> &middot;`);
		lines.push(`<a href="${image.fullUrl}" title="Copy Full URL">Full</a> &middot;`);
		lines.push(`<a href="${image.regularUrl}" title="Copy Regular URL">Reg</a> &middot;`);
		lines.push(`<a href="${image.smallUrl}" title="Copy Small URL">Sm</a> &middot;`);
		lines.push(`<a href="${image.thumbUrl}" title="Copy Thumb URL">Thumb</a>`);
		lines.push('</div>');

		// METADATA
		lines.push('<div style="padding-left: 0.5rem; color: gray">');
		if (image.user?.firstName) {
			lines.push(image.user.firstName) + ' ';
		}
		if (image.user?.lastName) {
			lines.push(image.user.lastName) + ' ';
		}
		lines.push(` (${image.width}x${image.height}px)`);
		lines.push('</div>');

		// END
		lines.push('</div>');
	}

}
