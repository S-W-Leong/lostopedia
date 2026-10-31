import unittest

from test_archive import load


PREFIX = 'lostopedia/database/'


def key(day, attempt=1):
    return f'{PREFIX}202610{day:02d}T191700Z-{day}-{attempt}.tar.age'


class RetentionTests(unittest.TestCase):
    def test_newest_eight_completed_pairs_are_preserved(self):
        objects = [{'key': key(day), 'size': 10} for day in range(1, 11)]
        self.assertEqual(load('retention').select_deletions(objects, PREFIX, 8), [key(1), key(2)])

    def test_fewer_than_eight_and_retry_sorting(self):
        select = load('retention').select_deletions
        self.assertEqual(select([], PREFIX, 8), [])
        self.assertEqual(select([{'key': key(1), 'size': 10}], PREFIX, 8), [])
        objects = [{'key': key(1, n), 'size': 10} for n in [10, 2, 1, 3, 4, 5, 6, 7, 8, 9]]
        self.assertEqual(select(objects, PREFIX, 8), [key(1, 1), key(1, 2)])

    def test_foreign_malformed_duplicate_and_invalid_size_keys_are_rejected(self):
        select = load('retention').select_deletions
        for keys in [
            [{'key': 'other/database/20261001T191700Z-1-1.tar.age', 'size': 10}],
            [{'key': PREFIX + '../other.tar.age', 'size': 10}],
            [{'key': key(1), 'size': 0}],
            [{'key': key(1), 'size': 10}] * 2,
        ]:
            with self.subTest(keys=keys), self.assertRaises(ValueError):
                select(keys, PREFIX, 8)


if __name__ == '__main__':
    unittest.main()
