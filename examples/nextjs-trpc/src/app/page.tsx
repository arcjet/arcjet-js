import Link from 'next/link';

import { LatestPost } from '~/app/_components/post';
import { api, HydrateClient } from '~/trpc/server';
import styles from './index.module.css';

export default async function Home() {
	const hello = await api.post.hello({ text: 'from tRPC' });

	void api.post.getLatest.prefetch();

	return (
		<HydrateClient>
			<main className={styles.main}>
				<div className={styles.container}>
					<h1 className={styles.title}>Arcjet TRPC Rate limiting example</h1>
					<div className={styles.cardRow}>
						<Link
							className={styles.card}
							href="https://docs.arcjet.com/rate-limiting/quick-start"
							target="_blank"
						>
							<h3 className={styles.cardTitle}>Rate Limiting Documentation</h3>
							<div className={styles.cardText}>
								How rate limiting works, what algorithms to use and more.
							</div>
						</Link>
					</div>
					<div className={styles.showcaseContainer}>
						<p className={styles.showcaseText}>
							{hello ? hello.greeting : 'Loading tRPC query...'}
						</p>
					</div>

					<LatestPost />
				</div>
			</main>
		</HydrateClient>
	);
}
