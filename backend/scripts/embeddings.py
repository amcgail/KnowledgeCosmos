from common import *
from transformers import AutoTokenizer
from adapters import AutoAdapterModel
import gzip

if False:
    # load model and tokenizer
    tokenizer = AutoTokenizer.from_pretrained('allenai/specter2_base')

    #load base model
    model = AutoAdapterModel.from_pretrained('allenai/specter2_base')

    #load the adapter(s) as per the required task, provide an identifier for the adapter in load_as argument and activate it
    model.load_adapter("allenai/specter2", source="hf", load_as="specter2", set_active=True)

fn = DATA_FOLDER / 'MAG' / 'Papers.txt.gz'

def get_batches():
    # Open the outer gzip file in binary mode
    with gzip.open(fn, "rb") as outer:
        # Open the inner gzip stream in text mode (UTF-8)
        with gzip.open(outer, mode="rt", encoding="utf-8", errors="replace") as inner_stream:
            for line in inner_stream:
                if line.strip():
                    yield line.strip()

for b in get_batches():
    print(b)
    break

exit()

papers = [{'title': 'BERT', 'abstract': 'We introduce a new language representation model called BERT'},
          {'title': 'Attention is all you need', 'abstract': ' The dominant sequence transduction models are based on complex recurrent or convolutional neural networks'}]

# concatenate title and abstract
text_batch = [d['title'] + tokenizer.sep_token + (d.get('abstract') or '') for d in papers]
# preprocess the input
inputs = tokenizer(text_batch, padding=True, truncation=True, return_tensors="pt", return_token_type_ids=False, max_length=512)
output = model(**inputs)
# take the first token in the batch as the embedding
embeddings = output.last_hidden_state[:, 0, :]

print(embeddings)