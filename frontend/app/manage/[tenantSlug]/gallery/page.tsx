import { redirect } from "next/navigation"

import { auth } from "@/auth"
import {
	listGalleryForUser,
	MerchantGalleryError,
} from "@backend/services/merchantGalleryService"

import {
	addGalleryStyle,
	editGalleryStyle,
	removeGalleryStyle,
	updateGalleryStatus,
} from "./actions"

interface GalleryPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

export default async function MerchantGalleryPage({
	params,
}: GalleryPageProps) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	let styles
	try {
		styles = await listGalleryForUser(session.user.id, tenantSlug)
	} catch (error) {
		if (error instanceof MerchantGalleryError) redirect(`/manage/${tenantSlug}`)
		throw error
	}
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Storefront management</p>
					<h1>Gallery</h1>
					<p className="auth-card__intro">
						Review published styles and control which work appears on the public
						salon gallery.
					</p>
				</div>
			</header>
			<section className="manage-store-list" aria-label="Gallery styles">
				{styles.length === 0 ? (
					<p className="manage-empty">
						No gallery styles have been added yet. Media upload configuration is
						still pending.
					</p>
				) : (
					styles.map((style) => (
						<article className="manage-store" key={style.id}>
							<div>
								<p className="eyebrow">
									{style.published ? "Published" : "Draft"} ·{" "}
									{style.category?.label ?? "Uncategorised"}
								</p>
								<h2>{style.styleName}</h2>
								<p>
									{style.styleType ?? "Salon style"}
									{style.beforeImageUrl ? " · Before and after" : ""}
								</p>
							</div>
							<div className="manage-store__actions">
								<details>
									<summary>Edit</summary>
									<form className="onboarding-form" action={editGalleryStyle}>
										<input type="hidden" name="tenantSlug" value={tenantSlug} />
										<input
											type="hidden"
											name="galleryStyleId"
											value={style.id}
										/>
										<label>
											Style name
											<input
												name="styleName"
												defaultValue={style.styleName}
												required
											/>
										</label>
										<label>
											Image URL
											<input
												name="imageUrl"
												type="url"
												defaultValue={style.imageUrl}
												required
											/>
										</label>
										<label>
											Before image URL
											<input
												name="beforeImageUrl"
												type="url"
												defaultValue={style.beforeImageUrl ?? ""}
											/>
										</label>
										<label>
											Style type
											<input
												name="styleType"
												defaultValue={style.styleType ?? ""}
											/>
										</label>
										<label>
											Published
											<select
												name="published"
												defaultValue={String(style.published)}
											>
												<option value="true">Yes</option>
												<option value="false">No</option>
											</select>
										</label>
										<button
											className="button button--outline button--small"
											type="submit"
										>
											Save changes
										</button>
									</form>
								</details>
								<form action={updateGalleryStatus}>
									<input type="hidden" name="tenantSlug" value={tenantSlug} />
									<input type="hidden" name="galleryStyleId" value={style.id} />
									<input
										type="hidden"
										name="published"
										value={String(!style.published)}
									/>
									<button
										className="button button--outline button--small"
										type="submit"
									>
										{style.published ? "Unpublish" : "Publish"}
									</button>
								</form>
								<form action={removeGalleryStyle}>
									<input type="hidden" name="tenantSlug" value={tenantSlug} />
									<input type="hidden" name="galleryStyleId" value={style.id} />
									<button
										className="button button--outline button--small"
										type="submit"
									>
										Delete
									</button>
								</form>
							</div>
						</article>
					))
				)}
			</section>
			<form
				className="onboarding-form"
				action={addGalleryStyle}
				aria-label="Add gallery style"
			>
				<h2>Add gallery style</h2>
				<input type="hidden" name="tenantSlug" value={tenantSlug} />
				<label>
					Style name
					<input name="styleName" required minLength={2} maxLength={160} />
				</label>
				<label>
					Image URL
					<input name="imageUrl" type="url" required />
				</label>
				<label>
					Before image URL
					<input name="beforeImageUrl" type="url" />
				</label>
				<label>
					Style type
					<input name="styleType" maxLength={120} />
				</label>
				<label>
					Publish now
					<select name="published" defaultValue="true">
						<option value="true">Yes</option>
						<option value="false">No</option>
					</select>
				</label>
				<button className="button button--primary" type="submit">
					Add gallery style
				</button>
			</form>
		</main>
	)
}
