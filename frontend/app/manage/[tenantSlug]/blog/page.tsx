import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import { TenantImageUploadField } from "@/components/tenant/TenantImageUploadField"
import {
	listBlogsForUser,
	MerchantBlogError,
} from "@backend/services/merchantBlogService"
import { addBlog, editBlog, removeBlog, updateBlogStatus } from "./actions"

interface BlogPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

export default async function MerchantBlogPage({ params }: BlogPageProps) {
	const { tenantSlug } = await params
	redirect(`/manage/${encodeURIComponent(tenantSlug)}?section=blogs`)
	const session = await auth()
	const userId = session?.user?.id ?? ""
	if (!userId) redirect(getLoginUrlForPath(`/manage/${tenantSlug}/blog`))
	let posts: Awaited<ReturnType<typeof listBlogsForUser>>
	try {
		posts = await listBlogsForUser(userId, tenantSlug)
	} catch (error) {
		if (error instanceof MerchantBlogError) redirect(`/manage/${tenantSlug}`)
		throw error
	}
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Storefront management</p>
					<h1>Blog</h1>
					<p className="auth-card__intro">
						Publish salon stories and care guidance through the preserved public
						blog section.
					</p>
				</div>
			</header>
			<section className="manage-store-list" aria-label="Blog posts">
				{posts.length === 0 ? (
					<>
						<p className="manage-empty">
							No blog posts yet. Add your first salon story using the form below.
						</p>
						<Link className="button button--outline button--small" href="#add-blog-post">
							Write your first post
						</Link>
					</>
				) : (
					posts.map((post) => (
						<article className="manage-store" key={post.id}>
							<div className="manage-store__media">
								{post.imageUrl ? (
									<img src={post.imageUrl} alt={post.title} loading="lazy" />
								) : (
									<span>Blog story</span>
								)}
							</div>
							<div>
								<p className="eyebrow">
									{post.published ? "Published" : "Draft"} ·{" "}
									{post.publishDate.toISOString().slice(0, 10)}
								</p>
								<h2>{post.title}</h2>
								<p>{post.excerpt}</p>
								<p>
									{post.readTime ?? "Reading time not set"} · /{post.slug}
								</p>
							</div>
							<div className="manage-store__actions">
								<details>
									<summary>Edit</summary>
									<form className="onboarding-form" action={editBlog}>
										<input type="hidden" name="tenantSlug" value={tenantSlug} />
										<input type="hidden" name="blogId" value={post.id} />
										<label>
											Title
											<input name="title" defaultValue={post.title} required />
										</label>
										<label>
											Slug
											<input name="slug" defaultValue={post.slug} required />
										</label>
										<label>
											Excerpt
											<textarea
												name="excerpt"
												defaultValue={post.excerpt}
												required
											/>
										</label>
						<TenantImageUploadField tenantSlug={tenantSlug} name="imageUrl" label="Post image" kind="BLOG" defaultValue={post.imageUrl} />
										<label>
											Read time
											<input
												name="readTime"
												defaultValue={post.readTime ?? ""}
											/>
										</label>
										<label>
											Publish date
											<input
												name="publishDate"
												type="date"
												defaultValue={post.publishDate
													.toISOString()
													.slice(0, 10)}
												required
											/>
										</label>
										<label>
											Read more URL
											<input
												name="readMoreUrl"
												type="url"
												defaultValue={post.readMoreUrl ?? ""}
											/>
										</label>
										<label>
											Published
											<select
												name="published"
												defaultValue={String(post.published)}
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
								<form action={updateBlogStatus}>
									<input type="hidden" name="tenantSlug" value={tenantSlug} />
									<input type="hidden" name="blogId" value={post.id} />
									<input
										type="hidden"
										name="published"
										value={String(!post.published)}
									/>
									<button
										className="button button--outline button--small"
										type="submit"
									>
										{post.published ? "Unpublish" : "Publish"}
									</button>
								</form>
								<form action={removeBlog}>
									<input type="hidden" name="tenantSlug" value={tenantSlug} />
									<input type="hidden" name="blogId" value={post.id} />
									<button
										className="button button--outline button--small button--danger"
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
				id="add-blog-post"
				className="onboarding-form"
				action={addBlog}
				aria-label="Add blog post"
			>
				<h2>Add blog post</h2>
				<input type="hidden" name="tenantSlug" value={tenantSlug} />
				<label>
					Title
					<input name="title" required minLength={2} maxLength={200} />
				</label>
				<label>
					Slug
					<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
				</label>
				<label>
					Excerpt
					<textarea name="excerpt" required maxLength={5000} />
				</label>
				<TenantImageUploadField tenantSlug={tenantSlug} name="imageUrl" label="Post image" kind="BLOG" />
				<label>
					Read time
					<input name="readTime" maxLength={80} />
				</label>
				<label>
					Publish date
					<input name="publishDate" type="date" required />
				</label>
				<label>
					Read more URL
					<input name="readMoreUrl" type="url" />
				</label>
				<label>
					Publish now
					<select name="published" defaultValue="true">
						<option value="true">Yes</option>
						<option value="false">No</option>
					</select>
				</label>
				<button className="button button--primary" type="submit">
					Add blog post
				</button>
			</form>
		</main>
	)
}
