import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
	listBlogsForUser,
	MerchantBlogError,
} from "@backend/services/merchantBlogService"
import { removeBlog, updateBlogStatus } from "./actions"

interface BlogPageProps {
	readonly params: Promise<{ tenantSlug: string }>
}

export default async function MerchantBlogPage({ params }: BlogPageProps) {
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	let posts
	try {
		posts = await listBlogsForUser(session.user.id, tenantSlug)
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
					<p className="manage-empty">
						No blog posts have been added. Media upload configuration is still
						pending.
					</p>
				) : (
					posts.map((post) => (
						<article className="manage-store" key={post.id}>
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
		</main>
	)
}
