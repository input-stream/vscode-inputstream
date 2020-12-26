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
		let lines: string[] = [];
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

	private formatUnsplashImageResult(lines: string[], image: UnsplashImage | undefined) {
		if (!image) {
			return;
		}
        lines.push(`<div class="grid-item" style="padding: 0.5rem" data-id="${image.id}" onclick="postDataElementClick('image', this)">`);
		lines.push(`<img src="${image.url}" data-id="${image.id}">`);
		lines.push(`<div style="margin-top: -2.5rem; padding-left: 0.5rem; color: gray">${image.user?.firstName} ${image.user?.lastName} (${image.width}x${image.height}px)</div>`);
        lines.push('</div>');
	}

}
