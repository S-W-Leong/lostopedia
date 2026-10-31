"""Select only validated completed archives within this app's fixed prefix."""
import argparse
from datetime import datetime
import json
import re
import sys


PREFIX = 'lostopedia/database/'
NAME = re.compile(r'(\d{8}T\d{6}Z)-(\d+)-(\d+)\.tar\.age')


def order_key(key):
    if not key.startswith(PREFIX):
        raise ValueError('Foreign backup prefix')
    match = NAME.fullmatch(key[len(PREFIX):])
    if not match:
        raise ValueError('Malformed backup key')
    timestamp, run, attempt = match.groups()
    return datetime.strptime(timestamp, '%Y%m%dT%H%M%SZ'), int(run), int(attempt)


def select_deletions(objects, prefix=PREFIX, keep=8):
    if prefix != PREFIX or keep != 8:
        raise ValueError('Refusing unreviewed prefix/retention')
    keys = []
    for obj in objects:
        key = obj['key']
        order_key(key)
        if type(obj['size']) is not int or obj['size'] <= 0 or key in keys:
            raise ValueError('Invalid completed archive inventory')
        keys.append(key)
    return sorted(keys, key=order_key)[:-keep]


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--prefix', default=PREFIX)
    parser.add_argument('--keep', default=8, type=int)
    args = parser.parse_args()
    for key in select_deletions(json.load(sys.stdin), args.prefix, args.keep):
        print(key)
